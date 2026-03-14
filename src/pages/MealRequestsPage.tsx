import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { Send, Link as LinkIcon, ShoppingBag, Check, X, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface MealRequest {
  id: string;
  text: string;
  link: string;
  request_type: 'meal_request' | 'recipe_link' | 'order_in_request';
  requested_day: DayOfWeek | null;
  requested_meal_type: MealType | null;
  status: 'open' | 'reviewed' | 'added' | 'dismissed';
  created_at: string;
  created_by_user_id: string;
}

export default function MealRequestsPage() {
  const { user, householdId, role } = useAuth();
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [requestType, setRequestType] = useState<'meal_request' | 'recipe_link' | 'order_in_request'>('meal_request');
  const [requestedDay, setRequestedDay] = useState<string>('');
  const [requestedMeal, setRequestedMeal] = useState<string>('');

  const loadRequests = async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from('meal_requests')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    setRequests((data as MealRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [householdId]);

  const handleSubmit = async () => {
    if (!text.trim() && !link.trim()) return;
    if (!householdId || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('meal_requests').insert({
        household_id: householdId,
        created_by_user_id: user.id,
        text: text.trim(),
        link: link.trim(),
        request_type: requestType,
        requested_day: requestedDay ? (requestedDay as any) : null,
        requested_meal_type: requestedMeal ? (requestedMeal as any) : null,
        status: 'open',
      });
      setText('');
      setLink('');
      setRequestedDay('');
      setRequestedMeal('');
      toast.success('Request sent!');
      await loadRequests();
    } catch {
      toast.error('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'added' | 'dismissed') => {
    await supabase.from('meal_requests').update({ status }).eq('id', id);
    toast.success(status === 'added' ? 'Added to plan!' : 'Dismissed');
    await loadRequests();
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const pastRequests = requests.filter(r => r.status !== 'open');

  const typeIcon = (t: string) => {
    if (t === 'recipe_link') return <LinkIcon className="h-4 w-4" />;
    if (t === 'order_in_request') return <ShoppingBag className="h-4 w-4" />;
    return <Send className="h-4 w-4" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'added') return <Badge className="bg-green-500/10 text-green-700 border-green-200">Added</Badge>;
    if (s === 'dismissed') return <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>;
    return <Badge variant="outline">Open</Badge>;
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">
          {role === 'planner' ? 'Family Requests' : 'Request a Meal'}
        </h1>

        {/* Submit form - visible to all */}
        <Card className="card-warm p-5 space-y-4">
          <h2 className="font-semibold">What are you craving?</h2>
          <div className="flex gap-2">
            {(['meal_request', 'recipe_link', 'order_in_request'] as const).map(t => (
              <Button
                key={t}
                variant={requestType === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRequestType(t)}
              >
                {typeIcon(t)}
                <span className="ml-1 capitalize">{t.replace(/_/g, ' ')}</span>
              </Button>
            ))}
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder={requestType === 'order_in_request' ? "What do you want to order?" : "What do you feel like eating?"}
              value={text}
              onChange={e => setText(e.target.value)}
              rows={2}
            />
          </div>

          {requestType === 'recipe_link' && (
            <div>
              <Label className="text-xs">Recipe Link</Label>
              <Input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Day (optional)</Label>
              <Select value={requestedDay} onValueChange={setRequestedDay}>
                <SelectTrigger><SelectValue placeholder="Any day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any day</SelectItem>
                  {DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Meal (optional)</Label>
              <Select value={requestedMeal} onValueChange={setRequestedMeal}>
                <SelectTrigger><SelectValue placeholder="Any meal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any meal</SelectItem>
                  {PLANNER_MEAL_TYPES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={(!text.trim() && !link.trim()) || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Request
          </Button>
        </Card>

        {/* Open requests */}
        {openRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Open Requests ({openRequests.length})
            </h3>
            {openRequests.map(req => (
              <Card key={req.id} className="card-warm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {typeIcon(req.request_type)}
                      <span className="font-medium text-sm">{req.text || req.link}</span>
                    </div>
                    {req.link && req.request_type === 'recipe_link' && (
                      <a href={req.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{req.link}</a>
                    )}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {req.requested_day && <span>{req.requested_day}</span>}
                      {req.requested_meal_type && <span className="capitalize">{req.requested_meal_type}</span>}
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {role === 'planner' && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateStatus(req.id, 'added')}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleUpdateStatus(req.id, 'dismissed')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Past requests */}
        {pastRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Past</h3>
            {pastRequests.slice(0, 10).map(req => (
              <Card key={req.id} className="p-3 opacity-60">
                <div className="flex items-center gap-2 text-sm">
                  {typeIcon(req.request_type)}
                  <span className="flex-1 truncate">{req.text || req.link}</span>
                  {statusBadge(req.status)}
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && requests.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No requests yet. Submit your first craving!</p>
        )}
      </motion.div>
    </AppLayout>
  );
}

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
import { Send, Sparkles, BookOpen, Check, X, Loader2, PenLine } from 'lucide-react';
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

type RequestMode = 'type' | 'library' | 'ai';

interface AIIdea {
  title: string;
  description: string;
}

export default function MealRequestsPage() {
  const { user, householdId, role } = useAuth();
  const { recipes } = useAppContext();
  const isPlanner = role === 'planner';

  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [mode, setMode] = useState<RequestMode>('type');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [requestedDay, setRequestedDay] = useState<string>('');
  const [requestedMeal, setRequestedMeal] = useState<string>('');

  // Library state
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<AIIdea[]>([]);
  const [selectedAiIdea, setSelectedAiIdea] = useState<string>('');

  const loadRequests = async () => {
    if (!householdId) return;
    let query = supabase
      .from('meal_requests')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    // Requestors only see their own requests
    if (!isPlanner && user) {
      query = query.eq('created_by_user_id', user.id);
    }

    const { data } = await query;
    setRequests((data as MealRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [householdId]);

  const getRequestText = (): string => {
    if (mode === 'type') return text.trim();
    if (mode === 'library') return selectedRecipe;
    if (mode === 'ai') return selectedAiIdea;
    return '';
  };

  const handleSubmit = async () => {
    const requestText = getRequestText();
    if (!requestText) return;
    if (!householdId || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('meal_requests').insert({
        household_id: householdId,
        created_by_user_id: user.id,
        text: requestText + (note.trim() ? ` — ${note.trim()}` : ''),
        link: '',
        request_type: 'meal_request' as const,
        requested_day: (requestedDay && requestedDay !== 'any') ? (requestedDay as any) : null,
        requested_meal_type: (requestedMeal && requestedMeal !== 'any') ? (requestedMeal as any) : null,
        status: 'open' as const,
      });
      setText('');
      setNote('');
      setSelectedRecipe('');
      setSelectedAiIdea('');
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

  const handleGetAiIdeas = async () => {
    setAiLoading(true);
    setAiIdeas([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: { cuisine: 'any', mealType: requestedMeal || 'lunch', count: 5, maxPrepTime: 45 },
      });
      if (error) throw error;
      const ideas: AIIdea[] = (data?.recipes ?? []).map((r: any) => ({
        title: r.title,
        description: r.description,
      }));
      setAiIdeas(ideas);
      if (ideas.length === 0) toast.info('No ideas generated, try again');
    } catch {
      toast.error('AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const pastRequests = requests.filter(r => r.status !== 'open');

  const filteredLibraryRecipes = recipes.filter(r =>
    !librarySearch || r.title.toLowerCase().includes(librarySearch.toLowerCase())
  ).slice(0, 12);

  const statusBadge = (s: string) => {
    if (s === 'added') return <Badge className="bg-green-500/10 text-green-700 border-green-200">Added</Badge>;
    if (s === 'dismissed') return <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>;
    return <Badge variant="outline">Open</Badge>;
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">
          {isPlanner ? 'Family Requests' : 'Request a Meal'}
        </h1>

        {/* Submit form */}
        <Card className="card-warm p-5 space-y-4">
          <h2 className="font-semibold">What are you craving?</h2>

          {/* Mode selector */}
          <div className="flex gap-2">
            <Button variant={mode === 'type' ? 'default' : 'outline'} size="sm" onClick={() => setMode('type')}>
              <PenLine className="h-4 w-4 mr-1" /> Type it
            </Button>
            <Button variant={mode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setMode('library')}>
              <BookOpen className="h-4 w-4 mr-1" /> From Recipes
            </Button>
            <Button variant={mode === 'ai' ? 'default' : 'outline'} size="sm" onClick={() => setMode('ai')}>
              <Sparkles className="h-4 w-4 mr-1" /> AI Ideas
            </Button>
          </div>

          {/* Mode: Type */}
          {mode === 'type' && (
            <div>
              <Label className="text-xs">Meal name</Label>
              <Input
                placeholder="e.g. Butter chicken, Caesar salad..."
                value={text}
                onChange={e => setText(e.target.value)}
              />
            </div>
          )}

          {/* Mode: Library */}
          {mode === 'library' && (
            <div className="space-y-2">
              <Input
                placeholder="Search recipes..."
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {filteredLibraryRecipes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipe(r.title)}
                    className={`text-left text-xs p-2 rounded-lg border transition-colors ${
                      selectedRecipe === r.title
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-muted-foreground">{r.cuisine} · {r.prepTimeMinutes}m</div>
                  </button>
                ))}
              </div>
              {selectedRecipe && (
                <p className="text-sm text-primary font-medium">Selected: {selectedRecipe}</p>
              )}
            </div>
          )}

          {/* Mode: AI */}
          {mode === 'ai' && (
            <div className="space-y-3">
              <Button onClick={handleGetAiIdeas} variant="outline" disabled={aiLoading} className="w-full">
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {aiLoading ? 'Generating...' : 'Get Meal Ideas'}
              </Button>
              {aiIdeas.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {aiIdeas.map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAiIdea(idea.title)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAiIdea === idea.title
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-sm font-medium">{idea.title}</div>
                      <div className="text-xs text-muted-foreground">{idea.description}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedAiIdea && (
                <p className="text-sm text-primary font-medium">Selected: {selectedAiIdea}</p>
              )}
            </div>
          )}

          {/* Optional fields */}
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

          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input
              placeholder="e.g. Make it spicy, for 4 people..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!getRequestText() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Request
          </Button>
        </Card>

        {/* Open requests */}
        {openRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {isPlanner ? `Open Requests (${openRequests.length})` : `Your Open Requests (${openRequests.length})`}
            </h3>
            {openRequests.map(req => (
              <Card key={req.id} className="card-warm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <span className="font-medium text-sm">{req.text}</span>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {req.requested_day && <span>{req.requested_day}</span>}
                      {req.requested_meal_type && <span className="capitalize">{req.requested_meal_type}</span>}
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {isPlanner && (
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
                  <span className="flex-1 truncate">{req.text}</span>
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

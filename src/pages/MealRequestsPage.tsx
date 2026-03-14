import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { getMonday, formatDateKey, formatWeekLabel } from '@/lib/dateUtils';
import { Send, Check, X, Loader2, Heart, Calendar, Sparkles } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface MealRequest {
  id: string;
  text: string;
  link: string;
  request_type: string;
  requested_day: DayOfWeek | null;
  requested_meal_type: MealType | null;
  status: 'open' | 'reviewed' | 'added' | 'dismissed';
  created_at: string;
  created_by_user_id: string;
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍚',
  snack: '🍪',
  dinner: '🍽️',
};

// ════════════════════════════════════════════════════════════════════════════
// REQUESTOR VIEW — ultra-simple for kids and grandparents
// ════════════════════════════════════════════════════════════════════════════

function RequestorView() {
  const { user, householdId } = useAuth();
  const { recipes, weeklyPlans, mealSlots } = useAppContext();
  const [tab, setTab] = useState<'request' | 'calendar'>('request');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Week data for calendar view
  const monday = getMonday(new Date());
  const weekKey = formatDateKey(monday);
  const plan = weeklyPlans.find(p => p.weekStartDate === weekKey);
  const slots = plan ? mealSlots.filter(s => s.weeklyPlanId === plan.id) : [];

  // Load my requests
  useEffect(() => {
    if (!householdId || !user) return;
    supabase
      .from('meal_requests')
      .select('*')
      .eq('household_id', householdId)
      .eq('created_by_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { setRequests((data as MealRequest[]) ?? []); setLoading(false); });
  }, [householdId, user]);

  // Inspiration: popular/favorite recipes
  const inspiration = useMemo(() => {
    return recipes
      .filter(r => !r.isLinkOnly)
      .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
      .slice(0, 12);
  }, [recipes]);

  const handleSubmit = async (dishText?: string) => {
    const requestText = dishText || text.trim();
    if (!requestText || !householdId || !user) return;
    setSubmitting(true);
    try {
      await supabase.from('meal_requests').insert({
        household_id: householdId,
        created_by_user_id: user.id,
        text: requestText,
        link: '',
        request_type: 'meal_request',
        status: 'open',
      });
      setText('');
      toast.success('Request sent! 🎉');
      // Refresh
      const { data } = await supabase
        .from('meal_requests')
        .select('*')
        .eq('household_id', householdId)
        .eq('created_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setRequests((data as MealRequest[]) ?? []);
    } catch {
      toast.error('Oops, try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-lg mx-auto">

        {/* Tab switcher — big friendly buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTab('request')}
            className={`p-4 rounded-2xl text-center transition-all ${
              tab === 'request'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Heart className="h-7 w-7 mx-auto mb-1" />
            <div className="font-semibold">Request</div>
            <div className="text-xs opacity-80">Ask for a dish</div>
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`p-4 rounded-2xl text-center transition-all ${
              tab === 'calendar'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Calendar className="h-7 w-7 mx-auto mb-1" />
            <div className="font-semibold">This Week</div>
            <div className="text-xs opacity-80">See the plan</div>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'request' && (
            <motion.div key="request" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
              {/* Input */}
              <Card className="card-warm p-5 space-y-4">
                <h2 className="text-xl font-bold text-center">What are you craving? 😋</h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a dish name..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    className="text-base h-12"
                  />
                  <Button onClick={() => handleSubmit()} disabled={!text.trim() || submitting} className="h-12 px-5">
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </Card>

              {/* Inspiration — tappable chips */}
              {inspiration.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground">Tap to request</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inspiration.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleSubmit(r.title)}
                        className="px-3 py-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium"
                      >
                        {r.favorite && '❤️ '}{r.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* My requests */}
              {requests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Your requests</h3>
                  <div className="space-y-2">
                    {requests.slice(0, 5).map(req => (
                      <div key={req.id} className="flex items-center gap-2 text-sm bg-muted rounded-lg p-3">
                        <span className="flex-1">{req.text}</span>
                        {req.status === 'added' && <Badge className="bg-green-500/10 text-green-700 text-xs">Added! ✅</Badge>}
                        {req.status === 'open' && <Badge variant="outline" className="text-xs">Pending</Badge>}
                        {req.status === 'dismissed' && <Badge variant="outline" className="text-xs text-muted-foreground">Maybe later</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <Card className="card-warm p-4">
                <h2 className="text-lg font-bold mb-1">This Week's Plan</h2>
                <p className="text-xs text-muted-foreground mb-4">{formatWeekLabel(monday)}</p>

                {!plan ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No plan this week yet</p>
                ) : (
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map(day => {
                      const daySlots = slots.filter(s => s.dayOfWeek === day);
                      const hasMeals = daySlots.some(s => s.recipeIds.length > 0);
                      if (!hasMeals) return null;

                      return (
                        <div key={day}>
                          <div className="font-semibold text-sm mb-1">{day}</div>
                          <div className="space-y-1 ml-2">
                            {PLANNER_MEAL_TYPES.map(meal => {
                              const slot = daySlots.find(s => s.mealType === meal);
                              if (!slot || slot.recipeIds.length === 0) return null;
                              const slotRecipes = slot.recipeIds.map(id => recipes.find(r => r.id === id)?.title).filter(Boolean);
                              return (
                                <div key={meal} className="text-sm">
                                  <span className="text-muted-foreground">{MEAL_EMOJI[meal]}</span>{' '}
                                  {slotRecipes.join(', ')}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PLANNER VIEW — full request management
// ════════════════════════════════════════════════════════════════════════════

function PlannerView() {
  const { user, householdId } = useAuth();
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('meal_requests')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRequests((data as MealRequest[]) ?? []); setLoading(false); });
  }, [householdId]);

  const handleUpdateStatus = async (id: string, status: 'added' | 'dismissed') => {
    await supabase.from('meal_requests').update({ status }).eq('id', id);
    toast.success(status === 'added' ? 'Marked as added!' : 'Dismissed');
    const { data } = await supabase
      .from('meal_requests')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    setRequests((data as MealRequest[]) ?? []);
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const pastRequests = requests.filter(r => r.status !== 'open');

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Family Requests</h1>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : openRequests.length === 0 ? (
          <Card className="card-warm p-8 text-center">
            <p className="text-muted-foreground">No pending requests 🎉</p>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Open Requests ({openRequests.length})
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
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateStatus(req.id, 'added')}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleUpdateStatus(req.id, 'dismissed')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {pastRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Past</h3>
            {pastRequests.slice(0, 10).map(req => (
              <Card key={req.id} className="p-3 opacity-60">
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{req.text}</span>
                  {req.status === 'added' && <Badge className="bg-green-500/10 text-green-700 border-green-200 text-xs">Added</Badge>}
                  {req.status === 'dismissed' && <Badge variant="outline" className="text-xs text-muted-foreground">Dismissed</Badge>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — route based on role
// ════════════════════════════════════════════════════════════════════════════

export default function MealRequestsPage() {
  const { role } = useAuth();
  return role === 'planner' ? <PlannerView /> : <RequestorView />;
}

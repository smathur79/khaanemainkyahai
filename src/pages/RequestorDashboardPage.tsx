import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sun, Calendar, ChefHat, Clock, CheckCircle2, Circle, Send } from 'lucide-react';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek } from '@/types/models';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

interface MealRequest {
  id: string;
  text: string;
  link: string;
  request_type: string;
  status: string;
  created_at: string;
}

export default function RequestorDashboardPage() {
  const { householdId } = useAuth();
  const { household, recipes, weeklyPlans, mealSlots } = useAppContext();
  const [myRequests, setMyRequests] = useState<MealRequest[]>([]);

  // Today's day of week
  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const todayDayIndex = (today.getDay() + 6) % 7; // Mon=0
  const todayDay: DayOfWeek = DAYS_OF_WEEK[todayDayIndex];

  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const currentPlan = weeklyPlans.find(p => p.weekStartDate === weekKey);

  const todayMeals = useMemo(() => {
    if (!currentPlan) return [];
    const todaySlots = mealSlots.filter(
      s => s.weeklyPlanId === currentPlan.id && s.dayOfWeek === todayDay
    );
    return PLANNER_MEAL_TYPES.map(meal => {
      const slot = todaySlots.find(s => s.mealType === meal);
      const slotRecipes = slot
        ? slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean)
        : [];
      return { meal, recipes: slotRecipes as typeof recipes, entryType: slot?.entryType };
    }).filter(m => m.recipes.length > 0);
  }, [currentPlan, mealSlots, todayDay, recipes]);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from('meal_requests')
      .select('id, text, link, request_type, status, created_at')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setMyRequests((data as MealRequest[]) ?? []));
  }, [householdId]);

  const openRequests = myRequests.filter(r => r.status === 'open');
  const resolvedRequests = myRequests.filter(r => r.status !== 'open');

  const mealIcon = (meal: string) => {
    if (meal === 'breakfast') return '🌅';
    if (meal === 'lunch') return '☀️';
    if (meal === 'dinner') return '🌙';
    return '🍽️';
  };

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-2xl mx-auto"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{household?.name || 'Home'}</h1>
          <p className="text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>

        {/* Today's meals */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Today's meals
          </h2>
          {todayMeals.length > 0 ? (
            <div className="space-y-2">
              {todayMeals.map(({ meal, recipes: mealRecipes, entryType }) => (
                <Card key={meal} className="card-warm p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{mealIcon(meal)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground capitalize">
                          {meal}
                        </span>
                        {entryType && entryType !== 'cooked' && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {entryType.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium text-sm leading-snug">
                        {mealRecipes.map(r => r.title).join(' · ')}
                      </div>
                      {mealRecipes[0]?.prepTimeMinutes > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {mealRecipes[0].prepTimeMinutes} min
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-warm p-5 text-center">
              <ChefHat className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No meals planned for today yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later or request something!</p>
            </Card>
          )}
        </div>

        {/* Big CTA */}
        <Link to="/requests">
          <Card className="card-warm-hover p-5 border-primary/20 bg-primary/5 cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Request a dish</div>
                <div className="text-sm text-muted-foreground">Tell the family what you're craving</div>
              </div>
            </div>
          </Card>
        </Link>

        {/* My requests */}
        {myRequests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                My requests
              </h2>
              <Link to="/requests" className="text-xs text-primary hover:underline">See all</Link>
            </div>
            <div className="space-y-2">
              {openRequests.slice(0, 3).map(req => (
                <Card key={req.id} className="card-warm p-3">
                  <div className="flex items-center gap-3">
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{req.text || req.link}</span>
                    <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
                  </div>
                </Card>
              ))}
              {resolvedRequests.slice(0, 2).map(req => (
                <Card key={req.id} className="card-warm p-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm flex-1 truncate line-through">{req.text || req.link}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${req.status === 'added' ? 'text-green-700 border-green-200' : ''}`}
                    >
                      {req.status === 'added' ? 'Added' : 'Dismissed'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/planner">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <Calendar className="h-7 w-7 mx-auto text-primary mb-2" />
              <div className="font-semibold text-sm">This week</div>
            </Card>
          </Link>
          <Link to="/rituals">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <Sun className="h-7 w-7 mx-auto text-amber-500 mb-2" />
              <div className="font-semibold text-sm">Rituals</div>
            </Card>
          </Link>
        </div>
      </motion.div>
    </AppLayout>
  );
}

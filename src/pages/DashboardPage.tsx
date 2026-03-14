import { useAppContext } from '@/context/AppContext';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Sparkles, ChefHat, Clock, Heart, Users, UtensilsCrossed } from 'lucide-react';
import { getMonday, formatWeekLabel, formatDateKey } from '@/lib/dateUtils';
import { DAYS_OF_WEEK, DayOfWeek, PLANNER_MEAL_TYPES } from '@/types/models';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

const MEAL_EMOJI: Record<string, string> = { breakfast: '🍳', lunch: '🍚', snack: '🍪', dinner: '🍽️' };
const MEAL_LABELS: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

export default function DashboardPage() {
  const { household, familyMembers, recipes, weeklyPlans, mealSlots } = useAppContext();
  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const currentPlan = weeklyPlans.find(p => p.weekStartDate === weekKey);
  const currentSlots = currentPlan ? mealSlots.filter(s => s.weeklyPlanId === currentPlan.id) : [];
  const filledSlots = currentSlots.filter(s => s.recipeIds.length > 0);
  const totalSlots = DAYS_OF_WEEK.length * PLANNER_MEAL_TYPES.length;
  const favoriteRecipes = recipes.filter(r => r.favorite);
  const todayDayIndex = (today.getDay() + 6) % 7;
  const todayDay: DayOfWeek = DAYS_OF_WEEK[todayDayIndex];
  const todaySlots = currentSlots.filter(s => s.dayOfWeek === todayDay);
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const todayMeals = PLANNER_MEAL_TYPES.map(meal => {
    const slot = todaySlots.find(s => s.mealType === meal);
    const slotRecipes = slot ? slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as typeof recipes : [];
    return { meal, slot, recipes: slotRecipes };
  });
  const hasTodayMeals = todayMeals.some(m => m.recipes.length > 0);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{household?.name || 'Dashboard'}</h1>
          <p className="text-muted-foreground mt-1">{formatWeekLabel(monday)}</p>
        </div>

        {/* Today's Meals */}
        <Card className="card-warm p-5 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Today's Menu</h2>
                <p className="text-xs text-muted-foreground">{todayFormatted}</p>
              </div>
            </div>
            {currentPlan && <Link to="/planner"><Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">Edit plan</Badge></Link>}
          </div>
          {hasTodayMeals ? (
            <div className="space-y-3">
              {todayMeals.map(({ meal, slot, recipes: mealRecipes }) => (
                <div key={meal} className="flex items-start gap-3">
                  <div className="mt-0.5 text-lg flex-shrink-0 w-8 text-center">{MEAL_EMOJI[meal]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{MEAL_LABELS[meal]}</div>
                    {mealRecipes.length > 0 ? (
                      <div className="space-y-1">{mealRecipes.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2">
                          <span className="text-sm font-medium">{r.title}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{r.prepTimeMinutes}m</span>
                        </div>
                      ))}</div>
                    ) : <p className="text-sm text-muted-foreground italic">Nothing planned</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              {currentPlan ? (
                <><p className="text-sm text-muted-foreground mb-2">No meals planned for today</p><Link to="/planner"><Button size="sm" variant="outline">Add today's meals</Button></Link></>
              ) : (
                <><p className="text-sm text-muted-foreground mb-2">No plan for this week yet</p><Link to="/planner"><Button size="sm">Start Planning</Button></Link></>
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/planner', icon: Calendar, label: 'Plan This Week', color: 'text-primary' },
            { to: '/recipes', icon: BookOpen, label: 'Recipe Library', color: 'text-secondary-foreground' },
            { to: '/generate', icon: Sparkles, label: 'AI Recipes', color: 'text-accent-foreground' },
            { to: '/shortlist', icon: ChefHat, label: 'Discover', color: 'text-primary' },
          ].map(({ to, icon: IC, label, color }) => (
            <Link key={to} to={to}><Card className="card-warm-hover p-4 text-center cursor-pointer"><IC className={`h-8 w-8 mx-auto mb-2 ${color}`} /><div className="font-semibold text-sm">{label}</div></Card></Link>
          ))}
        </div>

        {/* This Week */}
        <Card className="card-warm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">This Week</h2>
            <Badge variant={currentPlan?.status === 'finalized' ? 'default' : 'outline'}>
              {currentPlan ? (currentPlan.status === 'finalized' ? 'Finalized' : 'Draft') : 'Not started'}
            </Badge>
          </div>
          {currentPlan ? (
            <div>
              <div className="text-sm text-muted-foreground mb-3">{filledSlots.length} of {totalSlots} meals planned</div>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(filledSlots.length / totalSlots) * 100}%` }} />
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-center">
                {DAYS_OF_WEEK.map((day, idx) => {
                  const daySlots = currentSlots.filter(s => s.dayOfWeek === day);
                  const filled = daySlots.filter(s => s.recipeIds.length > 0).length;
                  const isToday = idx === todayDayIndex;
                  return (
                    <div key={day} className={`space-y-0.5 rounded-lg py-1 ${isToday ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
                      <div className={`font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day.slice(0, 3)}</div>
                      <div className={`text-xs font-semibold ${filled === PLANNER_MEAL_TYPES.length ? 'text-primary' : 'text-muted-foreground'}`}>{filled}/{PLANNER_MEAL_TYPES.length}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4"><p className="text-muted-foreground text-sm mb-3">No plan for this week yet</p><Link to="/planner"><Button size="sm">Start Planning</Button></Link></div>
          )}
        </Card>

        {/* Family & Favorites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-warm p-5">
            <div className="flex items-center gap-2 mb-3"><Users className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Family</h2><Link to="/household" className="ml-auto"><Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">Manage</Badge></Link></div>
            <div className="space-y-2">
              {familyMembers.length > 0 ? familyMembers.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm"><Badge variant="outline" className="text-xs">{m.label}</Badge><span className="font-medium">{m.name}</span><span className="text-muted-foreground">· {m.foodType}</span></div>
              )) : <p className="text-sm text-muted-foreground">No family members added yet</p>}
            </div>
          </Card>
          <Card className="card-warm p-5">
            <div className="flex items-center gap-2 mb-3"><Heart className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Favorites</h2></div>
            {favoriteRecipes.length > 0 ? (
              <div className="space-y-1.5">{favoriteRecipes.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-sm"><Clock className="h-3 w-3 text-muted-foreground" /><span>{r.title}</span><span className="text-xs text-muted-foreground">{r.prepTimeMinutes}m</span></div>
              ))}</div>
            ) : <p className="text-sm text-muted-foreground">No favorites yet</p>}
          </Card>
        </div>
      </motion.div>
    </AppLayout>
  );
}

import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { PLANNER_MEAL_TYPES, DayOfWeek, DAYS_OF_WEEK } from '@/types/models';
import { getMonday, formatDateKey, formatWeekLabel } from '@/lib/dateUtils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Sun, Moon, ChefHat } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

export default function PrepPage() {
  const { recipes, weeklyPlans, mealSlots } = useAppContext();

  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const plan = weeklyPlans.find(p => p.weekStartDate === weekKey);

  // Determine tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDayIndex = (tomorrow.getDay() + 6) % 7; // Mon=0
  const tomorrowDay: DayOfWeek = DAYS_OF_WEEK[tomorrowDayIndex];

  const tomorrowSlots = useMemo(() => {
    if (!plan) return [];
    return mealSlots.filter(s => s.weeklyPlanId === plan.id && s.dayOfWeek === tomorrowDay);
  }, [plan, mealSlots, tomorrowDay]);

  const tomorrowMeals = useMemo(() => {
    return PLANNER_MEAL_TYPES.map(meal => {
      const slot = tomorrowSlots.find(s => s.mealType === meal);
      const slotRecipes = slot ? slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) : [];
      return { meal, slot, recipes: slotRecipes as typeof recipes };
    });
  }, [tomorrowSlots, recipes]);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Tomorrow's Prep</h1>
          <p className="text-sm text-muted-foreground">{tomorrowDay}'s meals at a glance</p>
        </div>

        {!plan ? (
          <Card className="card-warm p-8 text-center">
            <p className="text-muted-foreground">No plan for this week yet. Go to the planner to create one.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tomorrowMeals.map(({ meal, slot, recipes: mealRecipes }) => (
              <Card key={meal} className="card-warm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold capitalize">{meal}</h2>
                  {slot && (
                    <Badge variant="outline" className="text-xs capitalize">{slot.entryType.replace('_', ' ')}</Badge>
                  )}
                </div>
                {mealRecipes.length > 0 ? (
                  <div className="space-y-2">
                    {mealRecipes.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-muted rounded-lg p-3">
                        <div>
                          <div className="font-medium text-sm">{r.title}</div>
                          <div className="text-xs text-muted-foreground">{r.cuisine} · {r.prepTimeMinutes} min</div>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">{r.effort}</Badge>
                      </div>
                    ))}
                    {/* Prep hints */}
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prep hints</p>
                      {mealRecipes.some(r => r.ingredients.some(i => /soak|dal|rajma|chana|chole/i.test(i))) && (
                        <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded p-2">
                          <Moon className="h-3 w-3" /> <span>Soak lentils/beans tonight</span>
                        </div>
                      )}
                      {mealRecipes.some(r => r.ingredients.some(i => /chicken|fish|meat|thaw/i.test(i))) && (
                        <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded p-2">
                          <Moon className="h-3 w-3" /> <span>Thaw meat/fish overnight</span>
                        </div>
                      )}
                      {mealRecipes.some(r => r.effort === 'weekend' || r.prepTimeMinutes > 30) && (
                        <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded p-2">
                          <Sun className="h-3 w-3" /> <span>Start prep early — this takes time</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing planned yet</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

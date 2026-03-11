import { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { DAYS_OF_WEEK, MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { getMonday, formatWeekLabel, formatDateKey, addWeeks } from '@/lib/dateUtils';
import { getRecommendations } from '@/lib/recommendations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Sparkles, Save, Check, X, Copy, Wand2, Download } from 'lucide-react';
import { generateWeeklyPlanPdf } from '@/lib/generatePlanPdf';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function WeeklyPlannerPage() {
  const { recipes, familyMembers, weeklyPlans, mealSlots, createWeeklyPlan, getWeeklyPlan, getMealSlots, setMealSlot, finalizePlan, swipeDecisions } = useAppContext();

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const weekKey = formatDateKey(currentMonday);

  // Ensure plan exists
  let plan = getWeeklyPlan(weekKey);
  const planId = plan?.id;

  const slots = planId ? getMealSlots(planId) : [];

  const ensurePlan = () => {
    if (!planId) {
      createWeeklyPlan(weekKey);
    }
  };

  const getSlotRecipe = (day: DayOfWeek, meal: MealType) => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    if (!slot?.recipeId) return null;
    return recipes.find(r => r.id === slot.recipeId) || null;
  };

  const handleSetMeal = (day: DayOfWeek, meal: MealType, recipeId: string | null) => {
    ensurePlan();
    // Need to get the plan again after creation
    const p = getWeeklyPlan(weekKey);
    if (p) {
      setMealSlot(p.id, day, meal, recipeId);
    }
  };

  const handleAutoFill = () => {
    ensurePlan();
    const p = getWeeklyPlan(weekKey);
    if (!p) return;
    const usedIds: string[] = [];
    // Use liked swipe decisions first
    const likedDecisions = swipeDecisions.filter(d => d.weekStartDate === weekKey && d.decision === 'liked');

    for (const day of DAYS_OF_WEEK) {
      for (const meal of MEAL_TYPES) {
        const existing = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
        if (existing?.recipeId) {
          usedIds.push(existing.recipeId);
          continue;
        }

        // Check swipe decisions first
        const swiped = likedDecisions.find(d => d.mealType === meal && !usedIds.includes(d.recipeId));
        if (swiped) {
          setMealSlot(p.id, day, meal, swiped.recipeId);
          usedIds.push(swiped.recipeId);
          continue;
        }

        const recs = getRecommendations(recipes, familyMembers, meal, day, usedIds, 3);
        if (recs.length > 0) {
          setMealSlot(p.id, day, meal, recs[0].recipe.id);
          usedIds.push(recs[0].recipe.id);
        }
      }
    }
    toast.success('Week auto-filled with suggestions!');
  };

  const handleFinalize = () => {
    const p = getWeeklyPlan(weekKey);
    if (p) {
      finalizePlan(p.id);
      toast.success('Weekly plan finalized!');
    }
  };

  const handleDuplicate = (fromDay: DayOfWeek, meal: MealType) => {
    const recipe = getSlotRecipe(fromDay, meal);
    if (!recipe) return;
    ensurePlan();
    const p = getWeeklyPlan(weekKey);
    if (!p) return;
    for (const day of DAYS_OF_WEEK) {
      if (day !== fromDay) {
        const existing = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
        if (!existing?.recipeId) {
          setMealSlot(p.id, day, meal, recipe.id);
        }
      }
    }
    toast.success(`${recipe.title} duplicated across the week`);
  };

  const mealRecipes = (meal: MealType) => recipes.filter(r => r.mealTypes.includes(meal));

  plan = getWeeklyPlan(weekKey);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Week nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonday(addWeeks(currentMonday, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold">Weekly Planner</h1>
            <p className="text-sm text-muted-foreground">{formatWeekLabel(currentMonday)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonday(addWeeks(currentMonday, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAutoFill} variant="outline" size="sm">
            <Wand2 className="mr-1 h-4 w-4" /> Auto-fill Week
          </Button>
          {plan && (
            <Button onClick={handleFinalize} size="sm" disabled={plan.status === 'finalized'}>
              <Check className="mr-1 h-4 w-4" /> {plan.status === 'finalized' ? 'Finalized' : 'Finalize Plan'}
            </Button>
          )}
          <Badge variant="outline" className="text-xs self-center">
            {plan ? (plan.status === 'finalized' ? '✅ Finalized' : '📝 Draft') : 'No plan'}
          </Badge>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="font-semibold text-sm text-muted-foreground p-2">Day</div>
              {MEAL_TYPES.map(m => (
                <div key={m} className="font-semibold text-sm text-muted-foreground p-2 capitalize text-center">{m}</div>
              ))}
            </div>

            {/* Rows */}
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid grid-cols-4 gap-2 mb-2">
                <div className="flex items-center p-2 font-medium text-sm">{day}</div>
                {MEAL_TYPES.map(meal => {
                  const recipe = getSlotRecipe(day, meal);
                  return (
                    <Popover key={`${day}-${meal}`}>
                      <PopoverTrigger asChild>
                        <Card className={`card-warm-hover p-2 cursor-pointer min-h-[60px] flex flex-col justify-center ${recipe ? '' : 'border-dashed'}`}>
                          {recipe ? (
                            <>
                              <div className="text-xs font-semibold truncate">{recipe.title}</div>
                              <div className="text-[10px] text-muted-foreground">{recipe.cuisine} · {recipe.prepTimeMinutes}m</div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground text-center">+ Add</div>
                          )}
                        </Card>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="text-xs font-semibold mb-2 capitalize">{day} {meal}</div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {recipe && (
                            <>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleSetMeal(day, meal, null)}>
                                <X className="mr-1 h-3 w-3" /> Clear
                              </Button>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handleDuplicate(day, meal)}>
                                <Copy className="mr-1 h-3 w-3" /> Duplicate to empty slots
                              </Button>
                              <div className="border-t my-1" />
                            </>
                          )}
                          {mealRecipes(meal).map(r => (
                            <Button
                              key={r.id}
                              variant={recipe?.id === r.id ? 'secondary' : 'ghost'}
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => handleSetMeal(day, meal, r.id)}
                            >
                              {r.title}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { getMonday, formatWeekLabel, formatDateKey, addWeeks } from '@/lib/dateUtils';
import { getRecommendations } from '@/lib/recommendations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Check, X, Copy, Wand2, Download, Plus, Trash2, CopyCheck } from 'lucide-react';
import { generateWeeklyPlanPdf } from '@/lib/generatePlanPdf';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍚',
  snack: '🍪',
  dinner: '🍽️',
};

export default function WeeklyPlannerPage() {
  const {
    recipes, familyMembers, weeklyPlans, mealSlots,
    createWeeklyPlan, getWeeklyPlan, getMealSlots,
    setMealSlot, addRecipeToSlot, removeRecipeFromSlot, reorderRecipeInSlot,
    finalizePlan, swipeDecisions, household, clearWeek, copyLastWeek, addRecipe,
  } = useAppContext();

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const weekKey = formatDateKey(currentMonday);

  let plan = getWeeklyPlan(weekKey);
  const planId = plan?.id;
  const slots = planId ? getMealSlots(planId) : [];

  // Slot picker dialog state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState<DayOfWeek>('Monday');
  const [pickerMeal, setPickerMeal] = useState<MealType>('lunch');
  const [pickerSearch, setPickerSearch] = useState('');

  const ensurePlan = async () => {
    if (!planId) await createWeeklyPlan(weekKey);
  };

  const getSlotRecipes = (day: DayOfWeek, meal: MealType) => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    if (!slot || slot.recipeIds.length === 0) return [];
    return slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as typeof recipes;
  };

  const getSlotItems = (day: DayOfWeek, meal: MealType) => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    return slot?.items ?? [];
  };

  const openPicker = (day: DayOfWeek, meal: MealType) => {
    setPickerDay(day);
    setPickerMeal(meal);
    setPickerSearch('');
    setPickerOpen(true);
  };

  const handleAddRecipe = async (day: DayOfWeek, meal: MealType, recipeId: string) => {
    await ensurePlan();
    const p = getWeeklyPlan(weekKey);
    if (p) await addRecipeToSlot(p.id, day, meal, recipeId);
  };

  const handleAddFreeText = async (day: DayOfWeek, meal: MealType, text: string) => {
    if (!text.trim()) return;
    // Create a minimal recipe from free text
    const newId = await addRecipe({
      title: text.trim(),
      description: '',
      mealTypes: [meal],
      cuisine: 'Other',
      subCuisine: '',
      foodType: 'vegetarian',
      healthTag: 'balanced',
      effort: 'quick',
      moodTag: 'comfort',
      prepTimeMinutes: 20,
      difficulty: 'Easy',
      ingredients: [],
      instructions: '',
      tags: ['quick-add'],
      favorite: false,
      source: 'manual',
      sourceName: 'Quick add',
      sourceLink: '',
      isLinkOnly: false,
      kidFriendly: false,
      highProtein: false,
    });
    if (newId) {
      await ensurePlan();
      const p = getWeeklyPlan(weekKey);
      if (p) await addRecipeToSlot(p.id, day, meal, newId);
      toast.success(`"${text.trim()}" added to recipes & plan!`);
    }
    setPickerOpen(false);
  };

  const handleRemoveRecipe = async (day: DayOfWeek, meal: MealType, recipeId: string) => {
    const p = getWeeklyPlan(weekKey);
    if (p) await removeRecipeFromSlot(p.id, day, meal, recipeId);
  };

  const handleClearSlot = async (day: DayOfWeek, meal: MealType) => {
    const p = getWeeklyPlan(weekKey);
    if (p) await setMealSlot(p.id, day, meal, []);
  };

  const handleAutoFill = async () => {
    await ensurePlan();
    const p = getWeeklyPlan(weekKey);
    if (!p) return;
    const usedIds: string[] = [];
    const likedDecisions = swipeDecisions.filter(d => d.weekStartDate === weekKey && d.decision === 'liked');

    for (const day of DAYS_OF_WEEK) {
      for (const meal of PLANNER_MEAL_TYPES) {
        const existing = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
        if (existing && existing.recipeIds.length > 0) {
          usedIds.push(...existing.recipeIds);
          continue;
        }

        const swiped = likedDecisions.find(d => d.mealType === meal && !usedIds.includes(d.recipeId));
        if (swiped) {
          await setMealSlot(p.id, day, meal, [swiped.recipeId]);
          usedIds.push(swiped.recipeId);
          continue;
        }

        const recs = getRecommendations(recipes, familyMembers, meal, day, usedIds, 3);
        if (recs.length > 0) {
          await setMealSlot(p.id, day, meal, [recs[0].recipe.id]);
          usedIds.push(recs[0].recipe.id);
        }
      }
    }
    toast.success('Week auto-filled with suggestions!');
  };

  const handleFinalize = async () => {
    const p = getWeeklyPlan(weekKey);
    if (p) { await finalizePlan(p.id); toast.success('Weekly plan finalized!'); }
  };

  const handleClearWeek = async () => {
    const p = getWeeklyPlan(weekKey);
    if (p) { await clearWeek(p.id); toast.success('Week cleared!'); }
  };

  const handleCopyLastWeek = async () => {
    const prevMonday = addWeeks(currentMonday, -1);
    const prevWeekKey = formatDateKey(prevMonday);
    await ensurePlan();
    await copyLastWeek(weekKey, prevWeekKey);
    toast.success('Copied last week\'s plan!');
  };

  const handleDuplicate = async (fromDay: DayOfWeek, meal: MealType) => {
    const slotRecipes = getSlotRecipes(fromDay, meal);
    if (slotRecipes.length === 0) return;
    await ensurePlan();
    const p = getWeeklyPlan(weekKey);
    if (!p) return;
    for (const day of DAYS_OF_WEEK) {
      if (day !== fromDay) {
        const existing = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
        if (!existing || existing.recipeIds.length === 0) {
          await setMealSlot(p.id, day, meal, slotRecipes.map(r => r.id));
        }
      }
    }
    toast.success('Duplicated across the week');
  };

  // Recipe picker: show ALL recipes, matching meal type first, then others
  const pickerRecipes = useMemo(() => {
    const slotRecipeIds = new Set(getSlotRecipes(pickerDay, pickerMeal).map(r => r.id));
    const search = pickerSearch.toLowerCase();

    const filtered = recipes
      .filter(r => !r.isLinkOnly)
      .filter(r => !slotRecipeIds.has(r.id))
      .filter(r => {
        if (!search) return true;
        return r.title.toLowerCase().includes(search) ||
          r.cuisine.toLowerCase().includes(search) ||
          r.tags.some(t => t.toLowerCase().includes(search));
      });

    // Sort: matching meal type first, then favorites, then rest
    return filtered.sort((a, b) => {
      const aMatch = a.mealTypes.includes(pickerMeal) ? 1 : 0;
      const bMatch = b.mealTypes.includes(pickerMeal) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }, [recipes, pickerDay, pickerMeal, pickerSearch, slots]);

  const hasExactMatch = pickerSearch.trim() && pickerRecipes.some(
    r => r.title.toLowerCase() === pickerSearch.trim().toLowerCase()
  );

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
            <Wand2 className="mr-1 h-4 w-4" /> Auto-fill
          </Button>
          <Button onClick={handleCopyLastWeek} variant="outline" size="sm">
            <CopyCheck className="mr-1 h-4 w-4" /> Copy Last Week
          </Button>
          {plan && (
            <>
              <Button onClick={handleClearWeek} variant="outline" size="sm">
                <Trash2 className="mr-1 h-4 w-4" /> Clear Week
              </Button>
              <Button onClick={handleFinalize} size="sm" disabled={plan.status === 'finalized'}>
                <Check className="mr-1 h-4 w-4" /> {plan.status === 'finalized' ? 'Finalized' : 'Finalize'}
              </Button>
            </>
          )}
          {plan?.status === 'finalized' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateWeeklyPlanPdf({
                weekLabel: formatWeekLabel(currentMonday),
                householdName: household?.name ?? 'Family',
                slots,
                recipes,
              })}
            >
              <Download className="mr-1 h-4 w-4" /> PDF
            </Button>
          )}
          <Badge variant="outline" className="text-xs self-center">
            {plan ? (plan.status === 'finalized' ? '✅ Finalized' : '📝 Draft') : 'No plan'}
          </Badge>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-5 gap-2 mb-2">
              <div className="font-semibold text-sm text-muted-foreground p-2">Day</div>
              {PLANNER_MEAL_TYPES.map(m => (
                <div key={m} className="font-semibold text-sm text-muted-foreground p-2 capitalize text-center">
                  {MEAL_EMOJI[m]} {m}
                </div>
              ))}
            </div>

            {/* Rows */}
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid grid-cols-5 gap-2 mb-2">
                <div className="flex items-center p-2 font-medium text-sm">{day}</div>
                {PLANNER_MEAL_TYPES.map(meal => {
                  const slotRecipes = getSlotRecipes(day, meal);
                  const items = getSlotItems(day, meal);
                  const hasRecipes = slotRecipes.length > 0 || items.some(i => i.title && !i.recipeId);
                  return (
                    <Card
                      key={`${day}-${meal}`}
                      className={`card-warm-hover p-2 cursor-pointer min-h-[60px] flex flex-col justify-center ${hasRecipes ? '' : 'border-dashed'}`}
                      onClick={() => openPicker(day, meal)}
                    >
                      {slotRecipes.length > 0 ? (
                        <div className="space-y-0.5">
                          {slotRecipes.map((r, idx) => (
                            <div key={r.id} className="flex items-center gap-1 group">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{r.title}</div>
                                <div className="text-[10px] text-muted-foreground">{r.cuisine} · {r.prepTimeMinutes}m</div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveRecipe(day, meal, r.id); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Inline add more */}
                          <div className="text-[10px] text-muted-foreground text-center mt-1 hover:text-primary">+ more</div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center">+ Add</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Slot Picker Dialog */}
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="capitalize">
                {MEAL_EMOJI[pickerMeal]} {pickerDay} — {pickerMeal}
              </DialogTitle>
            </DialogHeader>

            {/* Current dishes in slot */}
            {getSlotRecipes(pickerDay, pickerMeal).length > 0 && (
              <div className="space-y-1 mb-3">
                <p className="text-xs font-medium text-muted-foreground">Current dishes</p>
                {getSlotRecipes(pickerDay, pickerMeal).map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-secondary rounded-lg">
                    <span className="truncate font-medium">{r.title}</span>
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {idx > 0 && (
                        <button onClick={() => { const p = getWeeklyPlan(weekKey); if (p) reorderRecipeInSlot(p.id, pickerDay, pickerMeal, idx, idx - 1); }} className="text-muted-foreground hover:text-foreground p-0.5">
                          <ChevronUp className="h-3 w-3" />
                        </button>
                      )}
                      {idx < getSlotRecipes(pickerDay, pickerMeal).length - 1 && (
                        <button onClick={() => { const p = getWeeklyPlan(weekKey); if (p) reorderRecipeInSlot(p.id, pickerDay, pickerMeal, idx, idx + 1); }} className="text-muted-foreground hover:text-foreground p-0.5">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      )}
                      <button onClick={() => handleRemoveRecipe(pickerDay, pickerMeal, r.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleClearSlot(pickerDay, pickerMeal)}>
                    <X className="mr-1 h-3 w-3" /> Clear all
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { handleDuplicate(pickerDay, pickerMeal); setPickerOpen(false); }}>
                    <Copy className="mr-1 h-3 w-3" /> Duplicate to empty days
                  </Button>
                </div>
                <div className="border-t my-2" />
              </div>
            )}

            {/* Search + Free type */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes or type a new dish..."
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="pl-9"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && pickerSearch.trim() && !hasExactMatch) {
                    await handleAddFreeText(pickerDay, pickerMeal, pickerSearch);
                  }
                }}
              />
            </div>

            {/* Free-type hint */}
            {pickerSearch.trim() && !hasExactMatch && (
              <button
                onClick={() => handleAddFreeText(pickerDay, pickerMeal, pickerSearch)}
                className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-sm transition-colors"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span>Create <strong>"{pickerSearch.trim()}"</strong> as new recipe & add it</span>
              </button>
            )}

            {/* Recipe list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0" style={{ maxHeight: '40vh' }}>
              {pickerRecipes.length === 0 && !pickerSearch.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">No recipes available</p>
              )}
              {pickerRecipes.slice(0, 40).map(r => (
                <button
                  key={r.id}
                  onClick={async () => {
                    await handleAddRecipe(pickerDay, pickerMeal, r.id);
                    setPickerSearch('');
                  }}
                  className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.cuisine} · {r.prepTimeMinutes}m
                      {r.favorite && ' · ❤️'}
                      {!r.mealTypes.includes(pickerMeal) && (
                        <span className="ml-1 text-muted-foreground/60">({r.mealTypes.join(', ')})</span>
                      )}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
              {pickerRecipes.length > 40 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 40 of {pickerRecipes.length} — refine your search
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}

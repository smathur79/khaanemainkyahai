import { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Search, MessageSquare } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { getMonday, formatWeekLabel, formatDateKey, addWeeks } from '@/lib/dateUtils';
import { getRecommendations } from '@/lib/recommendations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Check, X, Copy, Wand2, Download, Plus, Trash2, CopyCheck, ClipboardPaste } from 'lucide-react';
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

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const MEAL_KEY_MAP: Record<string, MealType> = {
  'B': 'breakfast',
  'L': 'lunch',
  'S': 'snack',
  'D': 'dinner',
};

interface RitualForPdf {
  title: string;
  ritual_type: 'morning' | 'night';
  items: { text: string }[];
}

export default function WeeklyPlannerPage() {
  const {
    recipes, familyMembers, weeklyPlans, mealSlots,
    createWeeklyPlan, getWeeklyPlan, getMealSlots,
    setMealSlot, addRecipeToSlot, removeRecipeFromSlot, reorderRecipeInSlot,
    finalizePlan, swipeDecisions, household, clearWeek, copyLastWeek, addRecipe,
  } = useAppContext();
  const { householdId } = useAuth();

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const weekKey = formatDateKey(currentMonday);

  let plan = getWeeklyPlan(weekKey);
  const planId = plan?.id;
  const slots = planId ? getMealSlots(planId) : [];

  // Slot picker dialog
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState<DayOfWeek>('Monday');
  const [pickerMeal, setPickerMeal] = useState<MealType>('lunch');
  const [pickerSearch, setPickerSearch] = useState('');

  // Bulk import dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  // WhatsApp copy
  const [copied, setCopied] = useState(false);

  // Rituals for PDF
  const [rituals, setRituals] = useState<RitualForPdf[]>([]);

  // Load rituals
  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const { data: rData } = await supabase
        .from('ritual_templates')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_active', true);
      if (!rData || rData.length === 0) { setRituals([]); return; }
      const ids = rData.map((r: any) => r.id);
      const { data: iData } = await supabase
        .from('ritual_template_items')
        .select('*')
        .in('ritual_template_id', ids)
        .order('sort_order');
      setRituals(rData.map((r: any) => ({
        title: r.title,
        ritual_type: r.ritual_type as 'morning' | 'night',
        items: (iData ?? []).filter((i: any) => i.ritual_template_id === r.id).map((i: any) => ({ text: i.text })),
      })));
    })();
  }, [householdId]);

  const ensurePlan = async () => {
    if (!planId) await createWeeklyPlan(weekKey);
  };

  const getSlotRecipes = (day: DayOfWeek, meal: MealType) => {
    const slot = slots.find(s => s.dayOfWeek === day && s.mealType === meal);
    if (!slot || slot.recipeIds.length === 0) return [];
    return slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) as typeof recipes;
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
    }
    return newId;
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
        if (existing && existing.recipeIds.length > 0) { usedIds.push(...existing.recipeIds); continue; }
        const swiped = likedDecisions.find(d => d.mealType === meal && !usedIds.includes(d.recipeId));
        if (swiped) { await setMealSlot(p.id, day, meal, [swiped.recipeId]); usedIds.push(swiped.recipeId); continue; }
        const recs = getRecommendations(recipes, familyMembers, meal, day, usedIds, 3);
        if (recs.length > 0) { await setMealSlot(p.id, day, meal, [recs[0].recipe.id]); usedIds.push(recs[0].recipe.id); }
      }
    }
    toast.success('Week auto-filled!');
  };

  const handleClearWeek = async () => {
    const p = getWeeklyPlan(weekKey);
    if (p) { await clearWeek(p.id); toast.success('Week cleared!'); }
  };

  const handleCopyLastWeek = async () => {
    const prevMonday = addWeeks(currentMonday, -1);
    await ensurePlan();
    await copyLastWeek(weekKey, formatDateKey(prevMonday));
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

  // ── PDF with rituals ──
  const handleExportPdf = () => {
    generateWeeklyPlanPdf({
      weekLabel: formatWeekLabel(currentMonday),
      householdName: household?.name ?? 'Family',
      slots,
      recipes,
      rituals: rituals.length > 0 ? rituals : undefined,
    });
  };

  // ── WhatsApp week copy ──
  const weekWhatsApp = useMemo(() => {
    const lines: string[] = [];
    lines.push(`🍽️ *${household?.name ?? 'Family'} — Meal Plan*`);
    lines.push(`📅 ${formatWeekLabel(currentMonday)}`);
    lines.push('');

    for (const day of DAYS_OF_WEEK) {
      const dayMeals: string[] = [];
      for (const meal of PLANNER_MEAL_TYPES) {
        const sr = getSlotRecipes(day, meal);
        if (sr.length > 0) {
          dayMeals.push(`${MEAL_EMOJI[meal]} ${sr.map(r => r.title).join(', ')}`);
        }
      }
      if (dayMeals.length > 0) {
        lines.push(`*${day}*`);
        lines.push(...dayMeals);
        lines.push('');
      }
    }
    return lines.join('\n');
  }, [slots, recipes, currentMonday, household]);

  const handleCopyWeek = () => {
    navigator.clipboard.writeText(weekWhatsApp);
    setCopied(true);
    toast.success('Week plan copied for WhatsApp!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Bulk import ──
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    try {
      await ensurePlan();
      const p = getWeeklyPlan(weekKey);
      if (!p) throw new Error('No plan');

      const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
      let currentDay: DayOfWeek | null = null;

      for (const line of lines) {
        // Check if line is a day name
        const dayMatch = DAYS_OF_WEEK.find(d => line.toLowerCase().startsWith(d.toLowerCase()));
        if (dayMatch) {
          currentDay = dayMatch;
          continue;
        }

        if (!currentDay) continue;

        // Parse meal line like "B: Poha, Chai" or "L: Dal tadka, Rice"
        const mealMatch = line.match(/^([BLSD]):\s*(.+)$/i);
        if (!mealMatch) continue;

        const mealKey = mealMatch[1].toUpperCase();
        const mealType = MEAL_KEY_MAP[mealKey];
        if (!mealType) continue;

        const dishes = mealMatch[2].split(',').map(d => d.trim()).filter(Boolean);

        // Find or create recipes for each dish
        const recipeIds: string[] = [];
        for (let dishName of dishes) {
          // Check for entry type hints
          const isOrderIn = /\(order\s*in\)/i.test(dishName);
          const isEatOut = /\(eat\s*out\)/i.test(dishName);
          dishName = dishName.replace(/\(order\s*in\)/i, '').replace(/\(eat\s*out\)/i, '').trim();

          if (!dishName) continue;

          // Try to find existing recipe (case-insensitive)
          const existing = recipes.find(r => r.title.toLowerCase() === dishName.toLowerCase());
          if (existing) {
            recipeIds.push(existing.id);
          } else {
            // Create new recipe
            const newId = await addRecipe({
              title: dishName,
              description: '',
              mealTypes: [mealType],
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
              tags: ['bulk-import'],
              favorite: false,
              source: 'manual',
              sourceName: 'Bulk import',
              sourceLink: '',
              isLinkOnly: false,
              kidFriendly: false,
              highProtein: false,
            });
            if (newId) recipeIds.push(newId);
          }
        }

        if (recipeIds.length > 0) {
          await setMealSlot(p.id, currentDay, mealType, recipeIds);
        }
      }

      toast.success('Week imported!');
      setBulkOpen(false);
      setBulkText('');
    } catch (e: any) {
      toast.error('Import failed: ' + (e.message || 'Unknown error'));
    } finally {
      setBulkImporting(false);
    }
  };

  // Recipe picker
  const pickerRecipes = useMemo(() => {
    const slotRecipeIds = new Set(getSlotRecipes(pickerDay, pickerMeal).map(r => r.id));
    const search = pickerSearch.toLowerCase();
    return recipes
      .filter(r => !r.isLinkOnly && !slotRecipeIds.has(r.id))
      .filter(r => !search || r.title.toLowerCase().includes(search) || r.cuisine.toLowerCase().includes(search) || r.tags.some(t => t.toLowerCase().includes(search)))
      .sort((a, b) => {
        const aMatch = a.mealTypes.includes(pickerMeal) ? 1 : 0;
        const bMatch = b.mealTypes.includes(pickerMeal) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
  }, [recipes, pickerDay, pickerMeal, pickerSearch, slots]);

  const hasExactMatch = pickerSearch.trim() && pickerRecipes.some(r => r.title.toLowerCase() === pickerSearch.trim().toLowerCase());

  plan = getWeeklyPlan(weekKey);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Week nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonday(addWeeks(currentMonday, -1))}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="text-center">
            <h1 className="text-xl font-bold">Weekly Planner</h1>
            <p className="text-sm text-muted-foreground">{formatWeekLabel(currentMonday)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonday(addWeeks(currentMonday, 1))}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Actions — clean, no finalize */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAutoFill} variant="outline" size="sm">
            <Wand2 className="mr-1 h-4 w-4" /> Auto-fill
          </Button>
          <Button onClick={handleCopyLastWeek} variant="outline" size="sm">
            <CopyCheck className="mr-1 h-4 w-4" /> Copy Last Week
          </Button>
          <Button onClick={() => setBulkOpen(true)} variant="outline" size="sm">
            <ClipboardPaste className="mr-1 h-4 w-4" /> Paste Menu
          </Button>
          {plan && (
            <Button onClick={handleClearWeek} variant="outline" size="sm">
              <Trash2 className="mr-1 h-4 w-4" /> Clear Week
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyWeek}>
            {copied ? <Check className="mr-1 h-4 w-4" /> : <MessageSquare className="mr-1 h-4 w-4" />}
            {copied ? 'Copied!' : 'WhatsApp'}
          </Button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-5 gap-2 mb-2">
              <div className="font-semibold text-sm text-muted-foreground p-2">Day</div>
              {PLANNER_MEAL_TYPES.map(m => (
                <div key={m} className="font-semibold text-sm text-muted-foreground p-2 capitalize text-center">
                  {MEAL_EMOJI[m]} {m}
                </div>
              ))}
            </div>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid grid-cols-5 gap-2 mb-2">
                <div className="flex items-center p-2 font-medium text-sm">{day}</div>
                {PLANNER_MEAL_TYPES.map(meal => {
                  const slotRecipes = getSlotRecipes(day, meal);
                  return (
                    <Card
                      key={`${day}-${meal}`}
                      className={`card-warm-hover p-2 cursor-pointer min-h-[60px] flex flex-col justify-center ${slotRecipes.length > 0 ? '' : 'border-dashed'}`}
                      onClick={() => openPicker(day, meal)}
                    >
                      {slotRecipes.length > 0 ? (
                        <div className="space-y-0.5">
                          {slotRecipes.map(r => (
                            <div key={r.id} className="flex items-center gap-1 group">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate">{r.title}</div>
                                <div className="text-[10px] text-muted-foreground">{r.cuisine} · {r.prepTimeMinutes}m</div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveRecipe(day, meal, r.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
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
              <DialogTitle className="capitalize">{MEAL_EMOJI[pickerMeal]} {pickerDay} — {pickerMeal}</DialogTitle>
            </DialogHeader>
            {getSlotRecipes(pickerDay, pickerMeal).length > 0 && (
              <div className="space-y-1 mb-3">
                <p className="text-xs font-medium text-muted-foreground">Current dishes</p>
                {getSlotRecipes(pickerDay, pickerMeal).map((r, idx) => (
                  <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-secondary rounded-lg">
                    <span className="truncate font-medium">{r.title}</span>
                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {idx > 0 && <button onClick={() => { const p = getWeeklyPlan(weekKey); if (p) reorderRecipeInSlot(p.id, pickerDay, pickerMeal, idx, idx - 1); }} className="text-muted-foreground hover:text-foreground p-0.5"><ChevronUp className="h-3 w-3" /></button>}
                      {idx < getSlotRecipes(pickerDay, pickerMeal).length - 1 && <button onClick={() => { const p = getWeeklyPlan(weekKey); if (p) reorderRecipeInSlot(p.id, pickerDay, pickerMeal, idx, idx + 1); }} className="text-muted-foreground hover:text-foreground p-0.5"><ChevronDown className="h-3 w-3" /></button>}
                      <button onClick={() => handleRemoveRecipe(pickerDay, pickerMeal, r.id)} className="text-muted-foreground hover:text-destructive p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleClearSlot(pickerDay, pickerMeal)}><X className="mr-1 h-3 w-3" /> Clear all</Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { handleDuplicate(pickerDay, pickerMeal); setPickerOpen(false); }}><Copy className="mr-1 h-3 w-3" /> Duplicate to empty days</Button>
                </div>
                <div className="border-t my-2" />
              </div>
            )}
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
                    setPickerSearch('');
                    toast.success(`"${pickerSearch.trim()}" added!`);
                  }
                }}
              />
            </div>
            {pickerSearch.trim() && !hasExactMatch && (
              <button
                onClick={async () => { await handleAddFreeText(pickerDay, pickerMeal, pickerSearch); setPickerSearch(''); toast.success(`"${pickerSearch.trim()}" added!`); }}
                className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-sm transition-colors"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span>Create <strong>"{pickerSearch.trim()}"</strong> & add it</span>
              </button>
            )}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0" style={{ maxHeight: '40vh' }}>
              {pickerRecipes.slice(0, 40).map(r => (
                <button key={r.id} onClick={async () => { await handleAddRecipe(pickerDay, pickerMeal, r.id); setPickerSearch(''); }} className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.cuisine} · {r.prepTimeMinutes}m{r.favorite ? ' · ❤️' : ''}{!r.mealTypes.includes(pickerMeal) ? ` (${r.mealTypes.join(', ')})` : ''}</div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Paste Week Menu</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mb-2">
              Paste your week plan using this format. Dishes not in your library will be auto-created.
            </p>
            <div className="text-xs bg-muted rounded-lg p-3 font-mono mb-3 whitespace-pre-wrap text-muted-foreground">
{`Monday
B: Poha, Chai
L: Dal tadka, Jeera rice
S: Fruit chaat
D: Chicken curry, Roti

Tuesday
B: Omelette, Toast
L: Rajma chawal
S: Maggi
D: Paneer bhurji, Roti`}
            </div>
            <Textarea
              placeholder="Paste your week plan here..."
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <Button onClick={handleBulkImport} className="w-full" disabled={!bulkText.trim() || bulkImporting}>
              {bulkImporting ? 'Importing...' : 'Import Week'}
            </Button>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}

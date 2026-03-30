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
import { ChevronLeft, ChevronRight, Check, X, Copy, Wand2, Download, Plus, Trash2, CopyCheck, ClipboardPaste, CalendarPlus } from 'lucide-react';
import { generateWeeklyPlanPdf } from '@/lib/generatePlanPdf';
import { parseWeeklyMenuText } from '@/lib/weeklyMenuImport';
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
    finalizePlan, swipeDecisions, household, clearWeek, copyLastWeek, addRecipe, refreshData,
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

  // Calendar sync dialog
  const [calSyncOpen, setCalSyncOpen] = useState(false);
  const [calLinks, setCalLinks] = useState<{ day: DayOfWeek; url: string }[]>([]);

  const openCalSync = () => {
    const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
    const links = DAYS_OF_WEEK.map(day => {
      const dayIndex = DAYS_OF_WEEK.indexOf(day);
      const date = new Date(currentMonday);
      date.setDate(date.getDate() + dayIndex);
      date.setHours(21, 0, 0, 0);
      const end = new Date(date);
      end.setMinutes(end.getMinutes() + 30);
      const dayMeals = PLANNER_MEAL_TYPES.map(meal => {
        const sr = getSlotRecipes(day, meal);
        return sr.length > 0 ? `${MEAL_EMOJI[meal]} ${sr.map(r => r.title).join(', ')}` : null;
      }).filter(Boolean);
      const details = dayMeals.length > 0 ? dayMeals.join('\n') : 'No meals planned';
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🍽️ Meal Prep — ${day}`)}&dates=${fmt(date)}/${fmt(end)}&details=${encodeURIComponent(details)}`;
      return { day, url };
    });
    setCalLinks(links);
    setCalSyncOpen(true);
  };

  // Meal type visibility toggles
  const [visibleMeals, setVisibleMeals] = useState<Set<MealType>>(new Set(PLANNER_MEAL_TYPES));

  const toggleMeal = (meal: MealType) => {
    setVisibleMeals(prev => {
      const next = new Set(prev);
      if (next.has(meal)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(meal);
      } else {
        next.add(meal);
      }
      return next;
    });
  };

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
      // addRecipe already calls refreshData, so slots should be current
      await ensurePlan();
      // Small delay to let React state settle after refreshData
      await new Promise(resolve => setTimeout(resolve, 100));
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
      const planId = await createWeeklyPlan(weekKey);
      if (!planId) throw new Error('No plan');

      const slotEntries = parseWeeklyMenuText(bulkText);
      if (slotEntries.length === 0) {
        throw new Error('Could not parse the pasted menu. Use day headers plus lines like "B: Poha" or "Breakfast: Poha".');
      }

      // Phase 2: Collect all unique dish names that need new recipes
      const allDishNames = [...new Set(slotEntries.flatMap(e => e.dishes))];
      const existingMap = new Map<string, string>(); // lowercase name → id
      recipes.forEach(r => existingMap.set(r.title.toLowerCase(), r.id));

      const newDishNames = allDishNames.filter(d => !existingMap.has(d.toLowerCase()));

      // Phase 3: Create all missing recipes in batch (via individual inserts, but no refreshData between them)
      if (newDishNames.length > 0 && householdId) {
        const newRows = newDishNames.map(dishName => ({
          household_id: householdId,
          title: dishName,
          description: '',
          meal_types: ['lunch'] as any,
          cuisine: 'Other',
          sub_cuisine: '',
          food_type: 'vegetarian' as any,
          health_tag: 'balanced' as any,
          effort: 'quick' as any,
          mood_tag: 'comfort',
          prep_time_minutes: 20,
          difficulty: 'Easy' as any,
          ingredients: [] as string[],
          instructions: '',
          tags: ['bulk-import'],
          favorite: false,
          source: 'manual',
          source_name: 'Bulk import',
          source_link: '',
          is_link_only: false,
          kid_friendly: false,
          high_protein: false,
        }));

        // Insert in chunks of 20
        for (let i = 0; i < newRows.length; i += 20) {
          await supabase.from('recipes').insert(newRows.slice(i, i + 20));
        }

        // Refresh once to get all new recipe IDs
        await refreshData();
      }

      // Phase 4: Build recipe ID lookup from latest state (after refresh)
      // We need to re-query because state may not have updated yet
      const { data: allRecipes } = await supabase.from('recipes').select('id, title').eq('household_id', householdId);
      const idLookup = new Map<string, string>();
      (allRecipes ?? []).forEach((r: any) => idLookup.set(r.title.toLowerCase(), r.id));

      // Phase 5: Set all meal slots — retry briefly if slots not yet visible
      let freshSlots: any[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: slotsData, error: slotsError } = await supabase
          .from('weekly_meal_slots')
          .select('id, day_of_week, meal_type')
          .eq('weekly_plan_id', planId);

        if (slotsError) throw slotsError;
        if (slotsData && slotsData.length > 0) { freshSlots = slotsData; break; }
        await new Promise(res => setTimeout(res, 200));
      }

      if (freshSlots.length === 0) throw new Error('Could not load meal slots after plan creation.');

      for (const entry of slotEntries) {
        const recipeIds = entry.dishes.map(d => idLookup.get(d.toLowerCase())).filter(Boolean) as string[];
        if (recipeIds.length === 0) continue;

        const slot = (freshSlots ?? []).find((s: any) => s.day_of_week === entry.day && s.meal_type === entry.meal);
        if (!slot) continue;

        // Delete existing items and insert new ones directly
        await supabase.from('weekly_meal_slot_items').delete().eq('weekly_meal_slot_id', slot.id);
        const items = recipeIds.map((rid, idx) => ({
          weekly_meal_slot_id: slot.id,
          recipe_id: rid,
          title: [...(allRecipes ?? [])].find((r: any) => r.id === rid)?.title ?? '',
          sort_order: idx,
        }));
        await supabase.from('weekly_meal_slot_items').insert(items);
      }

      // Phase 6: Single final refresh
      await refreshData();

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
          <Button variant="outline" size="sm" onClick={openCalSync}>
            <CalendarPlus className="mr-1 h-4 w-4" /> Calendar Sync
          </Button>
        </div>

        {/* Meal type toggles */}
        <div className="flex gap-2 flex-wrap">
          {PLANNER_MEAL_TYPES.map(m => (
            <button
              key={m}
              onClick={() => toggleMeal(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                visibleMeals.has(m)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent'
              }`}
            >
              {MEAL_EMOJI[m]} {MEAL_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${(visibleMeals.size + 1) * 160}px` }}>
            <div className={`grid gap-2 mb-2`} style={{ gridTemplateColumns: `160px repeat(${visibleMeals.size}, 1fr)` }}>
              <div className="font-semibold text-sm text-muted-foreground p-2">Day</div>
              {PLANNER_MEAL_TYPES.filter(m => visibleMeals.has(m)).map(m => (
                <div key={m} className="font-semibold text-sm text-muted-foreground p-2 capitalize text-center">
                  {MEAL_EMOJI[m]} {m}
                </div>
              ))}
            </div>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `160px repeat(${visibleMeals.size}, 1fr)` }}>
                <div className="flex items-center p-2 font-medium text-sm">{day}</div>
                {PLANNER_MEAL_TYPES.filter(meal => visibleMeals.has(meal)).map(meal => {
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

        {/* Calendar Sync Dialog */}
        <Dialog open={calSyncOpen} onOpenChange={setCalSyncOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Calendar Sync</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Click each day to add it to Google Calendar.</p>
            <div className="space-y-2 mt-2">
              {calLinks.map(({ day, url }) => (
                <a
                  key={day}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg border bg-muted hover:bg-primary/10 hover:border-primary transition-colors text-sm font-medium"
                >
                  <span>🍽️ Prep — {day}</span>
                  <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                </a>
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

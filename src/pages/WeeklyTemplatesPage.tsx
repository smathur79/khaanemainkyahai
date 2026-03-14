import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek, MealType } from '@/types/models';
import { Save, Download, Trash2, Loader2, LayoutTemplate } from 'lucide-react';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  is_default: boolean;
  slots: { day_of_week: DayOfWeek; meal_type: MealType; items: { recipe_id: string | null; title: string }[] }[];
}

export default function WeeklyTemplatesPage() {
  const { householdId } = useAuth();
  const { recipes, weeklyPlans, mealSlots, createWeeklyPlan, refreshData } = useAppContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  const loadTemplates = useCallback(async () => {
    if (!householdId) return;
    const { data: tData } = await supabase
      .from('weekly_templates')
      .select('*')
      .eq('household_id', householdId);

    if (!tData || tData.length === 0) { setTemplates([]); setLoading(false); return; }

    const templateIds = tData.map(t => t.id);
    const { data: slotsData } = await supabase
      .from('weekly_template_slots')
      .select('*')
      .in('weekly_template_id', templateIds);

    const slotIds = (slotsData ?? []).map(s => s.id);
    let itemsData: any[] = [];
    if (slotIds.length > 0) {
      const { data } = await supabase
        .from('weekly_template_slot_items')
        .select('*')
        .in('weekly_template_slot_id', slotIds);
      itemsData = data ?? [];
    }

    const mapped: Template[] = tData.map(t => {
      const tSlots = (slotsData ?? []).filter(s => s.weekly_template_id === t.id);
      return {
        id: t.id,
        name: t.name,
        is_default: t.is_default,
        slots: tSlots.map(s => ({
          day_of_week: s.day_of_week as DayOfWeek,
          meal_type: s.meal_type as MealType,
          items: itemsData
            .filter(i => i.weekly_template_slot_id === s.id)
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((i: any) => ({ recipe_id: i.recipe_id, title: i.title })),
        })),
      };
    });

    setTemplates(mapped);
    setLoading(false);
  }, [householdId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleSaveCurrentWeek = async () => {
    if (!householdId || !newName.trim()) return;
    setSaving(true);
    try {
      const monday = getMonday(new Date());
      const weekKey = formatDateKey(monday);
      const plan = weeklyPlans.find(p => p.weekStartDate === weekKey);
      if (!plan) { toast.error('No plan for current week'); setSaving(false); return; }
      const planSlots = mealSlots.filter(s => s.weeklyPlanId === plan.id);

      // Create template
      const { data: template } = await supabase
        .from('weekly_templates')
        .insert({ household_id: householdId, name: newName.trim() })
        .select()
        .single();

      if (!template) throw new Error('Failed to create template');

      // Create template slots
      for (const day of DAYS_OF_WEEK) {
        for (const meal of PLANNER_MEAL_TYPES) {
          const planSlot = planSlots.find(s => s.dayOfWeek === day && s.mealType === meal);
          const { data: tSlot } = await supabase
            .from('weekly_template_slots')
            .insert({
              weekly_template_id: template.id,
              day_of_week: day as any,
              meal_type: meal as any,
              entry_type: planSlot?.entryType as any ?? 'cooked',
              notes: planSlot?.notes ?? '',
            })
            .select()
            .single();

          if (tSlot && planSlot && planSlot.items.length > 0) {
            const items = planSlot.items.map((item, idx) => ({
              weekly_template_slot_id: tSlot.id,
              recipe_id: item.recipeId,
              title: item.title,
              sort_order: idx,
            }));
            await supabase.from('weekly_template_slot_items').insert(items);
          }
        }
      }

      setNewName('');
      toast.success('Template saved!');
      await loadTemplates();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (template: Template) => {
    setSaving(true);
    try {
      const monday = getMonday(new Date());
      const weekKey = formatDateKey(monday);
      await createWeeklyPlan(weekKey);
      await refreshData();

      // Need to re-fetch plan after creation
      const { data: planData } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('household_id', householdId!)
        .eq('week_start_date', weekKey)
        .single();

      if (!planData) throw new Error('Plan not found');

      const { data: currentSlots } = await supabase
        .from('weekly_meal_slots')
        .select('*')
        .eq('weekly_plan_id', planData.id);

      for (const tSlot of template.slots) {
        if (tSlot.items.length === 0) continue;
        const curSlot = (currentSlots ?? []).find(
          s => s.day_of_week === tSlot.day_of_week && s.meal_type === tSlot.meal_type
        );
        if (!curSlot) continue;

        // Clear existing
        await supabase.from('weekly_meal_slot_items').delete().eq('weekly_meal_slot_id', curSlot.id);

        const items = tSlot.items.map((item, idx) => ({
          weekly_meal_slot_id: curSlot.id,
          recipe_id: item.recipe_id,
          title: item.title,
          sort_order: idx,
        }));
        await supabase.from('weekly_meal_slot_items').insert(items);
      }

      await refreshData();
      toast.success('Template applied to current week!');
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    // Delete items, slots, then template
    const { data: slots } = await supabase.from('weekly_template_slots').select('id').eq('weekly_template_id', id);
    const slotIds = (slots ?? []).map(s => s.id);
    if (slotIds.length > 0) {
      await supabase.from('weekly_template_slot_items').delete().in('weekly_template_slot_id', slotIds);
      await supabase.from('weekly_template_slots').delete().eq('weekly_template_id', id);
    }
    await supabase.from('weekly_templates').delete().eq('id', id);
    toast.success('Template deleted');
    await loadTemplates();
  };

  const getRecipeTitle = (recipeId: string | null) => {
    if (!recipeId) return 'Custom';
    return recipes.find(r => r.id === recipeId)?.title ?? 'Unknown';
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6 text-primary" /> Weekly Templates
        </h1>

        {/* Save current week */}
        <Card className="card-warm p-5 space-y-3">
          <h2 className="font-semibold">Save Current Week as Template</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Template name (e.g. 'Healthy Week')"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <Button onClick={handleSaveCurrentWeek} disabled={!newName.trim() || saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
          </div>
        </Card>

        {/* Templates list */}
        {loading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No templates yet. Save your current week to create one!</p>
        ) : (
          <div className="space-y-4">
            {templates.map(template => {
              const filledSlots = template.slots.filter(s => s.items.length > 0);
              return (
                <Card key={template.id} className="card-warm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">{filledSlots.length} meals configured</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApplyTemplate(template)} disabled={saving}>
                        <Download className="mr-1 h-4 w-4" /> Apply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Mini grid preview */}
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="text-center">
                        <div className="font-medium text-muted-foreground mb-1">{day.slice(0, 3)}</div>
                        {PLANNER_MEAL_TYPES.map(meal => {
                          const slot = template.slots.find(s => s.day_of_week === day && s.meal_type === meal);
                          const hasItems = slot && slot.items.length > 0;
                          return (
                            <div
                              key={meal}
                              className={`rounded p-0.5 mb-0.5 truncate ${hasItems ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                              title={hasItems ? slot!.items.map(i => i.title || getRecipeTitle(i.recipe_id)).join(', ') : 'Empty'}
                            >
                              {hasItems ? slot!.items[0].title?.slice(0, 6) || '✓' : '—'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

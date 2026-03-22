import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLANNER_MEAL_TYPES, DayOfWeek, DAYS_OF_WEEK } from '@/types/models';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Sun, Moon, ChefHat, Copy, Check, Sunrise, Cookie, CalendarPlus } from 'lucide-react';
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
  snack: 'Afternoon Snack',
  dinner: 'Dinner',
};

interface RitualItem {
  id: string;
  text: string;
  sort_order: number;
}

interface Ritual {
  id: string;
  title: string;
  ritual_type: 'morning' | 'night';
  items: RitualItem[];
}

export default function PrepPage() {
  const { recipes, weeklyPlans, mealSlots } = useAppContext();
  const { householdId } = useAuth();
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');

  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const plan = weeklyPlans.find(p => p.weekStartDate === weekKey);

  // Determine tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDayIndex = (tomorrow.getDay() + 6) % 7;
  const tomorrowDay: DayOfWeek = DAYS_OF_WEEK[tomorrowDayIndex];
  const tomorrowFormatted = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Load rituals
  const loadRituals = useCallback(async () => {
    if (!householdId) return;
    const { data: rData } = await supabase
      .from('ritual_templates')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true);
    if (!rData || rData.length === 0) { setRituals([]); return; }
    const ids = rData.map(r => r.id);
    const { data: iData } = await supabase
      .from('ritual_template_items')
      .select('*')
      .in('ritual_template_id', ids)
      .order('sort_order');
    setRituals(rData.map(r => ({
      id: r.id,
      title: r.title,
      ritual_type: r.ritual_type as 'morning' | 'night',
      items: (iData ?? []).filter(i => i.ritual_template_id === r.id).map(i => ({ id: i.id, text: i.text, sort_order: i.sort_order })),
    })));
  }, [householdId]);

  useEffect(() => { loadRituals(); }, [loadRituals]);

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

  const nightRituals = rituals.filter(r => r.ritual_type === 'night');
  const morningRituals = rituals.filter(r => r.ritual_type === 'morning');

  // Prep hints
  const allTomorrowRecipes = tomorrowMeals.flatMap(m => m.recipes);
  const needsSoak = allTomorrowRecipes.some(r => r.ingredients.some(i => /soak|dal|rajma|chana|chole|rice/i.test(i)));
  const needsThaw = allTomorrowRecipes.some(r => r.ingredients.some(i => /chicken|fish|meat|thaw|prawn/i.test(i)));
  const needsEarlyStart = allTomorrowRecipes.some(r => r.effort === 'weekend' || r.prepTimeMinutes > 30);

  // Generate WhatsApp-friendly message
  const whatsappMessage = useMemo(() => {
    const lines: string[] = [];
    lines.push(`📋 *${tomorrowDay}'s Plan* (${tomorrowFormatted})`);
    lines.push('');

    // Night prep section
    const nightPrep: string[] = [];
    if (needsSoak) nightPrep.push('• Soak lentils/beans tonight');
    if (needsThaw) nightPrep.push('• Thaw meat/fish overnight');
    if (nightRituals.length > 0) {
      nightRituals.forEach(r => {
        r.items.forEach(i => nightPrep.push(`• ${i.text}`));
      });
    }
    if (nightPrep.length > 0) {
      lines.push('🌙 *Night Prep*');
      lines.push(...nightPrep);
      lines.push('');
    }

    // Morning section
    const morningItems: string[] = [];
    if (needsEarlyStart) morningItems.push('• Start prep early — some dishes take time');
    if (morningRituals.length > 0) {
      morningRituals.forEach(r => {
        r.items.forEach(i => morningItems.push(`• ${i.text}`));
      });
    }
    if (morningItems.length > 0) {
      lines.push('☀️ *Morning*');
      lines.push(...morningItems);
      lines.push('');
    }

    // Meal sections
    for (const { meal, slot, recipes: mealRecipes } of tomorrowMeals) {
      const emoji = MEAL_EMOJI[meal] || '🍽️';
      const label = MEAL_LABELS[meal] || meal;
      lines.push(`${emoji} *${label}*`);
      if (mealRecipes.length > 0) {
        mealRecipes.forEach(r => {
          lines.push(`• ${r.title} (${r.prepTimeMinutes}m)`);
        });
      } else if (slot && slot.entryType !== 'cooked') {
        lines.push(`• ${slot.entryType.replace('_', ' ')}`);
      } else {
        lines.push('• Not planned');
      }
      lines.push('');
    }

    // Notes
    if (notes.trim()) {
      lines.push('📝 *Notes*');
      lines.push(notes.trim());
      lines.push('');
    }

    return lines.join('\n');
  }, [tomorrowMeals, nightRituals, morningRituals, needsSoak, needsThaw, needsEarlyStart, notes, tomorrowDay, tomorrowFormatted]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    toast.success('Copied! Paste in WhatsApp');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCalendar = () => {
    const start = new Date();
    start.setHours(21, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    const formatLocalCalendarDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🍽️ Meal Prep — ${tomorrowDay} (${tomorrowFormatted})`)}&dates=${formatLocalCalendarDate(start)}/${formatLocalCalendarDate(end)}&details=${encodeURIComponent(whatsappMessage.replace(/\*/g, ''))}&add=${encodeURIComponent('shweta.mathur.82@gmail.com')}`;
    window.open(url, '_blank');
    toast.success('Opening Google Calendar…');
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Tomorrow's Prep</h1>
          <p className="text-sm text-muted-foreground">{tomorrowDay}, {tomorrowFormatted}</p>
        </div>

        {!plan ? (
          <Card className="card-warm p-8 text-center">
            <p className="text-muted-foreground">No plan for this week yet. Go to the planner to create one.</p>
          </Card>
        ) : (
          <>
            {/* Night Prep */}
            {(needsSoak || needsThaw || nightRituals.length > 0) && (
              <Card className="card-warm p-5 border-indigo-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold">Night Prep</h2>
                </div>
                <div className="space-y-2">
                  {needsSoak && (
                    <div className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3">
                      <span>🫘</span> <span>Soak lentils/beans tonight</span>
                    </div>
                  )}
                  {needsThaw && (
                    <div className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3">
                      <span>🧊</span> <span>Thaw meat/fish overnight</span>
                    </div>
                  )}
                  {nightRituals.map(r => (
                    <div key={r.id}>
                      {r.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3 mb-1">
                          <span>🌙</span> <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Morning */}
            {(needsEarlyStart || morningRituals.length > 0) && (
              <Card className="card-warm p-5 border-amber-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Sunrise className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-semibold">Morning</h2>
                </div>
                <div className="space-y-2">
                  {needsEarlyStart && (
                    <div className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3">
                      <span>⏰</span> <span>Start prep early — some dishes take time</span>
                    </div>
                  )}
                  {morningRituals.map(r => (
                    <div key={r.id}>
                      {r.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3 mb-1">
                          <span>☀️</span> <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Meals */}
            <div className="space-y-4">
              {tomorrowMeals.map(({ meal, slot, recipes: mealRecipes }) => (
                <Card key={meal} className="card-warm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{MEAL_EMOJI[meal]}</span>
                    <h2 className="text-lg font-semibold">{MEAL_LABELS[meal]}</h2>
                    {slot && slot.entryType !== 'cooked' && (
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
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing planned yet</p>
                  )}
                </Card>
              ))}
            </div>

            {/* Notes */}
            <Card className="card-warm p-5">
              <h2 className="text-sm font-semibold mb-2">📝 Extra Notes</h2>
              <Textarea
                placeholder="Any extra notes for tomorrow? (e.g., pack lunch for school, buy curd...)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </Card>

            {/* Copy for WhatsApp */}
            <Button onClick={handleCopy} className="w-full" size="lg">
              {copied ? <Check className="mr-2 h-5 w-5" /> : <Copy className="mr-2 h-5 w-5" />}
              {copied ? 'Copied!' : 'Copy for WhatsApp'}
            </Button>

            <Button onClick={handleAddToCalendar} variant="outline" className="w-full" size="lg">
              <CalendarPlus className="mr-2 h-5 w-5" />
              Add to Google Calendar
            </Button>

            {/* Preview */}
            <Card className="p-4 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed">{whatsappMessage}</pre>
            </Card>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
}

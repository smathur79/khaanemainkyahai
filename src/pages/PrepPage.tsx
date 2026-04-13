import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PLANNER_MEAL_TYPES, DayOfWeek, DAYS_OF_WEEK } from '@/types/models';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import { buildPrepPlanMessage, toCalendarDetailsText } from '@/lib/calendarText';
import { useDailyQuote, formatQuoteFooter } from '@/hooks/useDailyQuote';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const dailyQuote = useDailyQuote();

  const today = new Date();
  const thisMonday = getMonday(today);

  // Default to tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDayIndex = (tomorrow.getDay() + 6) % 7;

  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week
  const [selectedDayIndex, setSelectedDayIndex] = useState(tomorrowDayIndex);

  const monday = new Date(thisMonday);
  monday.setDate(thisMonday.getDate() + weekOffset * 7);
  const weekKey = formatDateKey(monday);
  const plan = weeklyPlans.find(p => p.weekStartDate === weekKey);

  const selectedDay: DayOfWeek = DAYS_OF_WEEK[selectedDayIndex];
  const selectedDate = new Date(monday);
  selectedDate.setDate(monday.getDate() + selectedDayIndex);
  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

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

  const selectedSlots = useMemo(() => {
    if (!plan) return [];
    return mealSlots.filter(s => s.weeklyPlanId === plan.id && s.dayOfWeek === selectedDay);
  }, [plan, mealSlots, selectedDay]);

  const selectedMeals = useMemo(() => {
    return PLANNER_MEAL_TYPES.map(meal => {
      const slot = selectedSlots.find(s => s.mealType === meal);
      const slotRecipes = slot ? slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean) : [];
      return { meal, slot, recipes: slotRecipes as typeof recipes };
    });
  }, [selectedSlots, recipes]);

  const nightRituals = rituals.filter(r => r.ritual_type === 'night');
  const morningRituals = rituals.filter(r => r.ritual_type === 'morning');

  const allSelectedRecipes = selectedMeals.flatMap(m => m.recipes);
  const needsSoak = allSelectedRecipes.some(r => r.ingredients.some(i => /soak|dal|rajma|chana|chole|rice/i.test(i)));
  const needsThaw = allSelectedRecipes.some(r => r.ingredients.some(i => /chicken|fish|meat|thaw|prawn/i.test(i)));
  const needsEarlyStart = allSelectedRecipes.some(r => r.effort === 'weekend' || r.prepTimeMinutes > 30);

  const whatsappMessage = useMemo(() => {
    const nightPrep: string[] = [];
    if (needsSoak) nightPrep.push('Soak lentils/beans tonight');
    if (needsThaw) nightPrep.push('Thaw meat/fish overnight');
    nightRituals.forEach(r => r.items.forEach(i => nightPrep.push(i.text)));

    const morningItems: string[] = [];
    if (needsEarlyStart) morningItems.push('Start prep early — some dishes take time');
    morningRituals.forEach(r => r.items.forEach(i => morningItems.push(i.text)));

    const message = buildPrepPlanMessage({
      dayLabel: selectedDay,
      dateLabel: selectedDateLabel,
      nightPrep,
      morningPrep: morningItems,
      meals: selectedMeals.map(({ meal, slot, recipes: mealRecipes }) => ({
        meal,
        label: MEAL_LABELS[meal] || meal,
        emoji: MEAL_EMOJI[meal] || '🍽️',
        recipes: mealRecipes.map(r => ({ title: r.title, prepTimeMinutes: r.prepTimeMinutes })),
        entryType: slot?.entryType,
      })),
      notes,
    });
    return message + formatQuoteFooter(dailyQuote);
  }, [selectedMeals, nightRituals, morningRituals, needsSoak, needsThaw, needsEarlyStart, notes, selectedDay, selectedDateLabel, dailyQuote]);

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    toast.success('Copied! Paste in WhatsApp');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCalendar = () => {
    // Prep event is the evening before the selected day at 9pm
    const prepDate = new Date(selectedDate);
    prepDate.setDate(prepDate.getDate() - 1);
    prepDate.setHours(21, 0, 0, 0);
    const end = new Date(prepDate);
    end.setMinutes(end.getMinutes() + 30);

    const fmt = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}00`;
    };

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🍽️ Meal Prep — ${selectedDay}`)}&dates=${fmt(prepDate)}/${fmt(end)}&details=${encodeURIComponent(toCalendarDetailsText(whatsappMessage))}&add=${encodeURIComponent('shweta.mathur.82@gmail.com')}`;
    window.open(url, '_blank');
    toast.success('Opening Google Calendar…');
  };

  const dayPills = DAYS_OF_WEEK.map((day, idx) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + idx);
    const isToday = weekOffset === 0 && idx === (today.getDay() + 6) % 7;
    const label = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = date.getDate();
    return { day, idx, label, dateNum, isToday };
  });

  const weekLabel = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' +
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl mx-auto">
        {/* Week nav + day picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium">{weekLabel}</span>
            <button onClick={() => setWeekOffset(w => Math.min(2, w + 1))} disabled={weekOffset >= 2} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {dayPills.map(({ day, idx, label, dateNum, isToday }) => (
              <button
                key={day}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors flex-shrink-0 ${
                  selectedDayIndex === idx
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span>{label}</span>
                <span className="text-sm font-bold">{dateNum}</span>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCopy} className="w-full" size="lg">
          {copied ? <Check className="mr-2 h-5 w-5" /> : <Copy className="mr-2 h-5 w-5" />}
          {copied ? 'Copied!' : 'Copy for WhatsApp'}
        </Button>

        <Button onClick={handleAddToCalendar} variant="outline" className="w-full" size="lg">
          <CalendarPlus className="mr-2 h-5 w-5" />
          Add to Google Calendar
        </Button>

        <Card className="p-4 bg-muted/30">
          <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed">{whatsappMessage}</pre>
        </Card>
      </motion.div>
    </AppLayout>
  );
}

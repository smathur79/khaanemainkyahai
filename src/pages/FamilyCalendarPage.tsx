import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { FamilyEvent, EventCategory, EVENT_CATEGORIES, DAYS_OF_WEEK, DayOfWeek } from '@/types/models';
import { getMonday, formatWeekLabel, formatDateKey, addWeeks } from '@/lib/dateUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Plus, Copy, Check, Trash2, ExternalLink,
  ChevronDown, ChevronUp, ClipboardPaste, Calendar,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ── constants ──────────────────────────────────────────────────────────────
const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍚',
  snack: '🍪',
  dinner: '🍽️',
};

const MEAL_TYPES_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function getCategoryEmoji(cat: EventCategory): string {
  return EVENT_CATEGORIES.find(c => c.value === cat)?.emoji ?? '📌';
}

function getCategoryLabel(cat: EventCategory): string {
  return EVENT_CATEGORIES.find(c => c.value === cat)?.label ?? 'Other';
}

// Format HH:MM to "6:00 PM"
function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Parse schedule text into events
function parseScheduleText(text: string, familyMembers: { id: string; name: string }[]): Partial<FamilyEvent>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const events: Partial<FamilyEvent>[] = [];
  let currentDate = '';

  const dayNames: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
    friday: 4, saturday: 5, sunday: 6,
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Check if it's a day heading
    const dayMatch = Object.keys(dayNames).find(d => lower.startsWith(d));
    if (dayMatch && line.length < 20) {
      currentDate = dayMatch; // store day name, will be resolved externally
      continue;
    }
    if (!currentDate) continue;

    // Parse event line: optional time + title + "— Member" + "(location or travel)"
    let remaining = line;
    let startTime: string | null = null;
    let endTime: string | null = null;

    // Time at start: "6:00 PM", "6:00", "18:00"
    const timeMatch = remaining.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*[-–]?\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*/);
    const singleTimeMatch = remaining.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*/);

    if (timeMatch) {
      startTime = parseTimeString(`${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3] ?? ''}`);
      endTime = parseTimeString(`${timeMatch[4]}:${timeMatch[5]} ${timeMatch[6] ?? ''}`);
      remaining = remaining.slice(timeMatch[0].length);
    } else if (singleTimeMatch) {
      startTime = parseTimeString(`${singleTimeMatch[1]}:${singleTimeMatch[2]} ${singleTimeMatch[3] ?? ''}`);
      remaining = remaining.slice(singleTimeMatch[0].length);
    }

    // Extract member: "— Name" or "- Name" at end
    let familyMemberId: string | null = null;
    const memberMatch = remaining.match(/\s*[—\-]\s*([A-Za-z]+)\s*(?:\(|$)/);
    if (memberMatch) {
      const memberName = memberMatch[1].toLowerCase();
      const found = familyMembers.find(m => m.name.toLowerCase().startsWith(memberName));
      if (found) {
        familyMemberId = found.id;
        remaining = remaining.slice(0, memberMatch.index!).trim();
      }
    }

    // Extract location / travel time from parentheses
    let location: string | null = null;
    let travelTimeMinutes: number | null = null;
    const parenMatch = remaining.match(/\(([^)]+)\)/g);
    if (parenMatch) {
      for (const p of parenMatch) {
        const inner = p.slice(1, -1);
        const travelMatch = inner.match(/(\d+)\s*min/i);
        if (travelMatch) {
          travelTimeMinutes = parseInt(travelMatch[1]);
        } else {
          location = inner;
        }
        remaining = remaining.replace(p, '').trim();
      }
    }

    const title = remaining.replace(/[—\-].*$/, '').trim();
    if (!title) continue;

    // Auto-detect category
    const titleLower = title.toLowerCase();
    let category: EventCategory = 'other';
    if (/swim|dance|basketball|class|gym|yoga|tennis|football|cricket|karate|music/.test(titleLower)) category = 'activity';
    else if (/doctor|dentist|vaccine|hospital|clinic|therapy|checkup/.test(titleLower)) category = 'medical';
    else if (/exam|ptm|school|homework|project|test|assignment/.test(titleLower)) category = 'school';
    else if (/birthday|dinner|guests|party|celebration|wedding/.test(titleLower)) category = 'social';
    else if (/flight|trip|hotel|travel|airport|vacation|holiday/.test(titleLower)) category = 'travel';

    events.push({
      title,
      startTime,
      endTime,
      isAllDay: !startTime,
      category,
      familyMemberId,
      location,
      travelTimeMinutes,
      notes: null,
      isRecurring: false,
      recurrenceRule: null,
      _dayName: currentDate, // temp field for resolution
    } as any);
  }

  return events;
}

function parseTimeString(s: string): string | null {
  const match = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = (match[3] ?? '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Build Google Calendar URL for a single event
function buildGCalUrl(event: FamilyEvent, memberEmail?: string): string {
  const dateStr = event.eventDate.replace(/-/g, '');
  let dates: string;
  if (event.isAllDay) {
    const next = new Date(event.eventDate);
    next.setDate(next.getDate() + 1);
    dates = `${dateStr}/${next.toISOString().split('T')[0].replace(/-/g, '')}`;
  } else {
    const start = event.startTime ? `${dateStr}T${event.startTime.replace(':', '')}00` : `${dateStr}T090000`;
    const end = event.endTime ? `${dateStr}T${event.endTime.replace(':', '')}00` : `${dateStr}T100000`;
    dates = `${start}/${end}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
  });
  if (event.location) params.set('location', event.location);
  if (event.notes) params.set('details', event.notes);
  if (memberEmail) params.set('add', memberEmail);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ── empty form ─────────────────────────────────────────────────────────────
interface EventFormData {
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  category: EventCategory;
  familyMemberId: string;
  location: string;
  travelTimeMinutes: string;
  notes: string;
  showMore: boolean;
}

const emptyForm = (date: string): EventFormData => ({
  title: '',
  eventDate: date,
  startTime: '',
  endTime: '',
  isAllDay: false,
  category: 'other',
  familyMemberId: '',
  location: '',
  travelTimeMinutes: '',
  notes: '',
  showMore: false,
});

// ── main page ──────────────────────────────────────────────────────────────
export default function FamilyCalendarPage() {
  const {
    familyEvents, familyMembers, weeklyPlans, mealSlots, recipes,
    addFamilyEvent, updateFamilyEvent, deleteFamilyEvent,
    getEventsForDate, getEventsForWeek, getWeeklyPlan, getMealSlots,
  } = useAppContext();

  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const weekKey = formatDateKey(currentMonday);

  const [displayMode, setDisplayMode] = useState<'meals' | 'schedule' | 'both'>('both');
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // day detail
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm(weekKey));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [whatsAppCopied, setWhatsAppCopied] = useState(false);

  const weekEvents = useMemo(() => getEventsForWeek(weekKey), [familyEvents, weekKey]);
  const plan = getWeeklyPlan(weekKey);
  const slots = plan ? getMealSlots(plan.id) : [];

  // Build per-day data
  const weekDays = useMemo(() => {
    return DAYS_OF_WEEK.map((day, idx) => {
      const date = new Date(currentMonday);
      date.setDate(date.getDate() + idx);
      const dateKey = formatDateKey(date);
      const dayEvents = weekEvents.filter(e => e.eventDate === dateKey);
      const daySlots = slots.filter(s => s.dayOfWeek === day);
      return { day, date, dateKey, events: dayEvents, slots: daySlots };
    });
  }, [currentMonday, weekEvents, slots]);

  // ── event form helpers ────────────────────────────────────────────────────
  const openAddEvent = (date: string) => {
    setEditingEvent(null);
    setForm(emptyForm(date));
    setEventFormOpen(true);
  };

  const openEditEvent = (event: FamilyEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      eventDate: event.eventDate,
      startTime: event.startTime ?? '',
      endTime: event.endTime ?? '',
      isAllDay: event.isAllDay,
      category: event.category,
      familyMemberId: event.familyMemberId ?? '',
      location: event.location ?? '',
      travelTimeMinutes: event.travelTimeMinutes ? String(event.travelTimeMinutes) : '',
      notes: event.notes ?? '',
      showMore: !!(event.location || event.travelTimeMinutes || event.notes),
    });
    setEventFormOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.eventDate) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        eventDate: form.eventDate,
        startTime: form.isAllDay ? null : (form.startTime || null),
        endTime: form.isAllDay ? null : (form.endTime || null),
        isAllDay: form.isAllDay,
        category: form.category,
        familyMemberId: form.familyMemberId || null,
        location: form.location.trim() || null,
        travelTimeMinutes: form.travelTimeMinutes ? parseInt(form.travelTimeMinutes) : null,
        notes: form.notes.trim() || null,
        isRecurring: false,
        recurrenceRule: null,
      };
      if (editingEvent) {
        await updateFamilyEvent(editingEvent.id, payload);
        toast.success('Event updated');
      } else {
        await addFamilyEvent(payload);
        toast.success('Event added');
      }
      setEventFormOpen(false);
    } catch {
      toast.error('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    if (!confirm(`Delete "${editingEvent.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteFamilyEvent(editingEvent.id);
      toast.success('Event deleted');
      setEventFormOpen(false);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // ── bulk import ───────────────────────────────────────────────────────────
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    try {
      const parsed = parseScheduleText(bulkText, familyMembers);
      const dayNames: Record<string, number> = {
        monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
        friday: 4, saturday: 5, sunday: 6,
      };
      let imported = 0;
      for (const e of parsed) {
        const dayName = (e as any)._dayName as string;
        if (!dayName || !(dayName in dayNames)) continue;
        const date = new Date(currentMonday);
        date.setDate(date.getDate() + dayNames[dayName]);
        const dateKey = formatDateKey(date);
        await addFamilyEvent({
          title: e.title!,
          eventDate: dateKey,
          startTime: e.startTime ?? null,
          endTime: e.endTime ?? null,
          isAllDay: e.isAllDay ?? false,
          category: e.category ?? 'other',
          familyMemberId: e.familyMemberId ?? null,
          location: e.location ?? null,
          travelTimeMinutes: e.travelTimeMinutes ?? null,
          notes: null,
          isRecurring: false,
          recurrenceRule: null,
        });
        imported++;
      }
      toast.success(`${imported} event${imported !== 1 ? 's' : ''} imported`);
      setBulkOpen(false);
      setBulkText('');
    } catch {
      toast.error('Import failed');
    } finally {
      setBulkImporting(false);
    }
  };

  // ── WhatsApp copy ─────────────────────────────────────────────────────────
  const buildWhatsAppText = () => {
    const label = formatWeekLabel(currentMonday);
    let text = `📅 *Family Calendar* — ${label}\n\n`;
    for (const { day, events, slots } of weekDays) {
      text += `*${day}*\n`;
      // Meals line
      const mealLine = MEAL_TYPES_ORDER.map(mt => {
        const slot = slots.find(s => s.mealType === mt);
        if (!slot || slot.items.length === 0) return null;
        return `${MEAL_EMOJI[mt]} ${slot.items.map(i => i.title).join(' + ')}`;
      }).filter(Boolean).join(' · ');
      if (mealLine) text += `${mealLine}\n`;
      // Events
      for (const ev of events) {
        const timeStr = ev.startTime ? `${formatTime(ev.startTime)}${ev.endTime ? `–${formatTime(ev.endTime)}` : ''}` : '';
        const member = familyMembers.find(m => m.id === ev.familyMemberId);
        text += `${getCategoryEmoji(ev.category)} ${ev.title}${timeStr ? ` ${timeStr}` : ''}${member ? ` (${member.name})` : ''}\n`;
      }
      text += '\n';
    }
    return text.trim();
  };

  const handleWhatsAppCopy = async () => {
    const text = buildWhatsAppText();
    await navigator.clipboard.writeText(text);
    setWhatsAppCopied(true);
    toast.success('Copied for WhatsApp!');
    setTimeout(() => setWhatsAppCopied(false), 2000);
  };

  // ── day detail ────────────────────────────────────────────────────────────
  const selectedDayData = selectedDate ? weekDays.find(d => d.dateKey === selectedDate) : null;

  if (selectedDayData) {
    const { day, date, dateKey, events, slots: daySlots } = selectedDayData;

    // Merge meals + events sorted by time
    type TimelineItem =
      | { type: 'meal'; mealType: string; items: { title: string }[] }
      | { type: 'event'; event: FamilyEvent };

    const mealOrder: Record<string, number> = { breakfast: 7, lunch: 12, snack: 16, dinner: 19 };
    const timeline: (TimelineItem & { sortHour: number })[] = [];

    for (const mt of MEAL_TYPES_ORDER) {
      const slot = daySlots.find(s => s.mealType === mt);
      if (slot && slot.items.length > 0) {
        timeline.push({ type: 'meal', mealType: mt, items: slot.items, sortHour: mealOrder[mt] });
      }
    }
    for (const ev of events) {
      const h = ev.startTime ? parseInt(ev.startTime.split(':')[0]) : 13;
      timeline.push({ type: 'event', event: ev, sortHour: h });
    }
    timeline.sort((a, b) => a.sortHour - b.sortHour);

    return (
      <AppLayout>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>← Week</Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{day}</h1>
              <p className="text-sm text-muted-foreground">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <Button size="sm" onClick={() => openAddEvent(dateKey)}>
              <Plus className="h-4 w-4 mr-1" /> Add Event
            </Button>
          </div>

          {timeline.length === 0 ? (
            <Card className="card-warm p-8 text-center">
              <p className="text-muted-foreground text-sm">Nothing planned yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => openAddEvent(dateKey)}>
                <Plus className="h-4 w-4 mr-1" /> Add first event
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {timeline.map((item, idx) => {
                if (item.type === 'meal') {
                  return (
                    <Card key={`meal-${idx}`} className="card-warm p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{MEAL_EMOJI[item.mealType]}</span>
                        <div>
                          <p className="text-xs text-muted-foreground capitalize">{item.mealType}</p>
                          <p className="font-medium text-sm">{item.items.map(i => i.title).join(' · ')}</p>
                        </div>
                      </div>
                    </Card>
                  );
                }
                const ev = item.event;
                const member = familyMembers.find(m => m.id === ev.familyMemberId);
                return (
                  <Card key={`ev-${ev.id}`} className="card-warm p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEditEvent(ev)}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{getCategoryEmoji(ev.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">{ev.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {ev.startTime && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(ev.startTime)}{ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}
                            </span>
                          )}
                          {member && <span className="text-xs text-muted-foreground">{member.name}</span>}
                          {ev.location && <span className="text-xs text-muted-foreground">📍 {ev.location}</span>}
                        </div>
                        {ev.travelTimeMinutes && (
                          <p className="text-xs text-amber-600 mt-0.5">🚗 {ev.travelTimeMinutes} min travel</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{getCategoryLabel(ev.category)}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {events.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {events.map(ev => {
                const member = familyMembers.find(m => m.id === ev.familyMemberId);
                const url = buildGCalUrl(ev, member?.calendarEmail || undefined);
                return (
                  <Button key={ev.id} variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" /> {ev.title} → GCal
                  </Button>
                );
              })}
            </div>
          )}
        </motion.div>

        <EventFormDialog
          open={eventFormOpen}
          onOpenChange={setEventFormOpen}
          form={form}
          setForm={setForm}
          onSave={handleSaveEvent}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
          saving={saving}
          deleting={deleting}
          isEditing={!!editingEvent}
          familyMembers={familyMembers}
        />
      </AppLayout>
    );
  }

  // ── week view ─────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold flex-1">Family Calendar</h1>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonday(prev => addWeeks(prev, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center font-medium text-sm">{formatWeekLabel(currentMonday)}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonday(prev => addWeeks(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Display toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {(['meals', 'schedule', 'both'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors capitalize ${
                displayMode === mode ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'meals' ? '🍽 Meals' : mode === 'schedule' ? '📅 Schedule' : '✨ Both'}
            </button>
          ))}
        </div>

        {/* Week day list */}
        <div className="space-y-2">
          {weekDays.map(({ day, date, dateKey, events, slots: daySlots }) => {
            const isToday = formatDateKey(new Date()) === dateKey;
            const hasMeals = displayMode !== 'schedule' && daySlots.some(s => s.items.length > 0);
            const hasEvents = displayMode !== 'meals' && events.length > 0;

            return (
              <Card
                key={day}
                className={`card-warm p-4 cursor-pointer hover:border-primary/30 transition-colors ${isToday ? 'border-primary/40 bg-primary/5' : ''}`}
                onClick={() => setSelectedDate(dateKey)}
              >
                <div className="flex items-start gap-3">
                  {/* Day label */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <p className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {DAY_SHORT[day]}
                    </p>
                    <p className={`text-lg font-bold leading-tight ${isToday ? 'text-primary' : ''}`}>
                      {date.getDate()}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Meals row */}
                    {hasMeals && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {MEAL_TYPES_ORDER.map(mt => {
                          const slot = daySlots.find(s => s.mealType === mt);
                          if (!slot || slot.items.length === 0) return null;
                          return `${MEAL_EMOJI[mt]} ${slot.items.map(i => i.title).join(' + ')}`;
                        }).filter(Boolean).join('  ·  ')}
                      </p>
                    )}
                    {/* Event pills */}
                    {hasEvents && (
                      <div className="flex flex-wrap gap-1.5">
                        {events.map(ev => {
                          const member = familyMembers.find(m => m.id === ev.familyMemberId);
                          return (
                            <button
                              key={ev.id}
                              onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                              className="inline-flex items-center gap-1 bg-secondary/60 hover:bg-secondary rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                              <span>{getCategoryEmoji(ev.category)}</span>
                              <span>{ev.title}</span>
                              {ev.startTime && <span className="text-muted-foreground">{formatTime(ev.startTime)}</span>}
                              {member && <span className="text-muted-foreground">· {member.name}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!hasMeals && !hasEvents && (
                      <p className="text-xs text-muted-foreground/50">Nothing planned</p>
                    )}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={e => { e.stopPropagation(); openAddEvent(dateKey); }}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <ClipboardPaste className="h-4 w-4 mr-1.5" /> Paste Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsAppCopy}>
            {whatsAppCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            Copy for WhatsApp
          </Button>
        </div>
      </motion.div>

      {/* Add/Edit Event Dialog */}
      <EventFormDialog
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
        form={form}
        setForm={setForm}
        onSave={handleSaveEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        saving={saving}
        deleting={deleting}
        isEditing={!!editingEvent}
        familyMembers={familyMembers}
      />

      {/* Paste Schedule Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paste Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste your week schedule. Day names on their own line, then events below. Example:
            </p>
            <pre className="text-xs bg-muted rounded-lg p-3 leading-relaxed text-muted-foreground">
{`Monday
6:00 PM Dance class — Ahana (20 min travel)
Tuesday
5:30 PM Basketball — Ahana (Condo)`}
            </pre>
            <Textarea
              placeholder="Paste schedule here..."
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="min-h-[180px] font-mono text-sm"
            />
            <Button onClick={handleBulkImport} className="w-full" disabled={!bulkText.trim() || bulkImporting}>
              {bulkImporting ? 'Importing...' : 'Import Events'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// ── Event Form Dialog ──────────────────────────────────────────────────────
interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: EventFormData;
  setForm: (fn: (prev: EventFormData) => EventFormData) => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
  deleting: boolean;
  isEditing: boolean;
  familyMembers: { id: string; name: string }[];
}

function EventFormDialog({ open, onOpenChange, form, setForm, onSave, onDelete, saving, deleting, isEditing, familyMembers }: EventFormDialogProps) {
  const set = (key: keyof EventFormData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Add Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title *</Label>
            <Input placeholder="e.g. Dance class" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isAllDay} onChange={e => set('isAllDay', e.target.checked)} />
                <span className="text-sm">All day</span>
              </label>
            </div>
          </div>

          {!form.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start time</Label>
                <Input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End time</Label>
                <Input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v as EventCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Family member</Label>
            <Select value={form.familyMemberId || '_none'} onValueChange={v => set('familyMemberId', v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Whole family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Whole family</SelectItem>
                {familyMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* More details toggle */}
          <button
            type="button"
            onClick={() => set('showMore', !form.showMore)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {form.showMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {form.showMore ? 'Less details' : 'More details'}
          </button>

          <AnimatePresence>
            {form.showMore && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input placeholder="e.g. Community Center" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Travel time (minutes)</Label>
                  <Input type="number" placeholder="e.g. 20" value={form.travelTimeMinutes} onChange={e => set('travelTimeMinutes', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea placeholder="Any notes..." value={form.notes} onChange={e => set('notes', e.target.value)} className="min-h-[70px]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={onSave} className="w-full" disabled={!form.title.trim() || saving}>
            {saving ? 'Saving...' : isEditing ? 'Update Event' : 'Add Event'}
          </Button>

          {isEditing && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="w-full" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ClipboardList, Settings, UtensilsCrossed } from 'lucide-react';
import { getMonday, formatWeekLabel, formatDateKey } from '@/lib/dateUtils';
import { DAYS_OF_WEEK, EVENT_CATEGORIES, EventCategory } from '@/types/models';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

// ── Jokes ─────────────────────────────────────────────────────────────────
const JOKES = [
  { q: "Why did the scarecrow win an award?", a: "Because he was outstanding in his field!" },
  { q: "What do you call a fish without eyes?", a: "A fsh!" },
  { q: "Why can't you give Elsa a balloon?", a: "Because she'll let it go!" },
  { q: "What do you call cheese that isn't yours?", a: "Nacho cheese!" },
  { q: "Why did the bicycle fall over?", a: "Because it was two-tired!" },
  { q: "What do you call a sleeping dinosaur?", a: "A dino-snore!" },
  { q: "Why did the math book look so sad?", a: "Because it had too many problems." },
  { q: "What do elves learn in school?", a: "The elf-abet!" },
  { q: "Why don't scientists trust atoms?", a: "Because they make up everything!" },
  { q: "What do you call a bear with no teeth?", a: "A gummy bear!" },
  { q: "How do you organize a space party?", a: "You planet!" },
  { q: "What did the ocean say to the beach?", a: "Nothing, it just waved!" },
  { q: "Why did the golfer bring two pairs of pants?", a: "In case he got a hole in one!" },
  { q: "What do you call a fake noodle?", a: "An impasta!" },
  { q: "Why did the tomato turn red?", a: "Because it saw the salad dressing!" },
  { q: "What did the janitor say when he jumped out of the closet?", a: "Supplies!" },
  { q: "Why do cows wear bells?", a: "Because their horns don't work!" },
  { q: "What do you call a snowman with a six-pack?", a: "An abdominal snowman!" },
  { q: "Why did the banana go to the doctor?", a: "Because it wasn't peeling well!" },
  { q: "What do you call a dino with no imagination?", a: "A bronto-bore-us!" },
  { q: "Why can't Elsa have a balloon?", a: "Because she'll let it go!" },
  { q: "What did one wall say to the other?", a: "I'll meet you at the corner!" },
];

// ── Small Talk Topics ─────────────────────────────────────────────────────
const SMALL_TALK = [
  "If you could have any superpower, what would it be?",
  "What's the best thing that happened today?",
  "If you could visit any place in the world, where would you go?",
  "What's your favourite meal we've ever cooked at home?",
  "If you could be any animal for a day, what would you pick?",
  "What's one thing you'd like to learn this year?",
  "If you had a million rupees, what's the first thing you'd do?",
  "What's the funniest thing that happened to you this week?",
  "If you could swap lives with anyone for a day, who would it be?",
  "What's something you're really proud of lately?",
  "What movie or show should the whole family watch together?",
  "If you could invent something, what problem would you solve?",
  "What's your favourite family memory?",
  "If you could eat only one food forever, what would it be?",
  "What's a new hobby you'd want to try?",
  "If you woke up as the family dog, what would your day look like?",
  "What's something kind you did for someone recently?",
  "If you could time-travel, would you go to the past or future?",
  "What's the weirdest dream you've had recently?",
  "What would your superhero name and power be?",
  "What's one thing you want to do before the end of the year?",
];

function getDailyIndex(arr: unknown[], date: Date): number {
  const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return day % arr.length;
}

function getCategoryEmoji(cat: EventCategory): string {
  return EVENT_CATEGORIES.find(c => c.value === cat)?.emoji ?? '📌';
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { household, familyMembers, recipes, mealSlots, weeklyPlans, getEventsForDate } = useAppContext();
  const today = new Date();
  const monday = getMonday(today);
  const todayKey = formatDateKey(today);
  const todayDayIndex = (today.getDay() + 6) % 7;
  const todayDay = DAYS_OF_WEEK[todayDayIndex];

  const plan = weeklyPlans.find(p => p.weekStartDate === formatDateKey(monday));
  const todaySlots = plan ? mealSlots.filter(s => s.weeklyPlanId === plan.id && s.dayOfWeek === todayDay) : [];
  const todayEvents = getEventsForDate(todayKey);
  const plannedMeals = mealSlots.filter(s => s.recipeIds.length > 0).length;

  const jokeIdx = getDailyIndex(JOKES, today);
  const joke = JOKES[jokeIdx];
  const talkIdx = getDailyIndex(SMALL_TALK, new Date(today.getTime() + 86400000)); // offset by 1 so different from joke
  const topic = SMALL_TALK[talkIdx];

  const [showJokeAnswer, setShowJokeAnswer] = useState(false);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wide">V4</Badge>
          <h1 className="text-3xl md:text-4xl font-bold">{household?.name || 'Family Planner'}</h1>
          <p className="text-muted-foreground">
            Choose what you want to plan this week. Keep meals and family calendar separate, but connected.
          </p>
          <p className="text-sm text-muted-foreground">{formatWeekLabel(monday)}</p>
        </div>

        {/* Today card */}
        {(todaySlots.some(s => s.items.length > 0) || todayEvents.length > 0) && (
          <Card className="card-warm p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Today</h3>
            <div className="space-y-1.5">
              {['breakfast', 'lunch', 'snack', 'dinner'].map(mt => {
                const slot = todaySlots.find(s => s.mealType === mt);
                if (!slot || slot.items.length === 0) return null;
                const emoji = { breakfast: '🍳', lunch: '🍚', snack: '🍪', dinner: '🍽️' }[mt];
                return (
                  <p key={mt} className="text-sm">
                    {emoji} {slot.items.map(i => i.title).join(' · ')}
                  </p>
                );
              })}
              {todayEvents.length > 0 && <div className="h-px bg-border my-2" />}
              {todayEvents.map(ev => {
                const member = familyMembers.find(m => m.id === ev.familyMemberId);
                return (
                  <div key={ev.id} className="flex items-center gap-2">
                    <span>{getCategoryEmoji(ev.category)}</span>
                    <span className="text-sm font-medium">{ev.title}</span>
                    {ev.startTime && <span className="text-xs text-muted-foreground">{formatTime(ev.startTime)}</span>}
                    {member && <span className="text-xs text-muted-foreground">· {member.name}</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Main planning card */}
        <Link to="/planner">
          <Card className="card-warm-hover p-6">
            <div className="space-y-4">
              <div className="inline-flex rounded-2xl bg-primary/10 p-3">
                <UtensilsCrossed className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Food Planning</h2>
                <p className="text-sm text-muted-foreground">
                  Build the weekly meal plan, prep list, recipes, and WhatsApp-ready family menu.
                </p>
              </div>
              <Button className="w-full justify-between">
                Open Food Planner <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Family</h3>
            <p className="mt-2 text-3xl font-bold">{familyMembers.length}</p>
            <p className="text-sm text-muted-foreground">People in this household</p>
          </Card>
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Recipes</h3>
            <p className="mt-2 text-3xl font-bold">{recipes.length}</p>
            <p className="text-sm text-muted-foreground">Dishes available</p>
          </Card>
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Planned Meals</h3>
            <p className="mt-2 text-3xl font-bold">{plannedMeals}</p>
            <p className="text-sm text-muted-foreground">Slots filled this week</p>
          </Card>
        </div>

        {/* Joke of the Moment */}
        <Card className="card-warm p-5 bg-amber-50/50 border-amber-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">😄</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1">Joke of the Moment</h3>
              <p className="text-sm font-medium">{joke.q}</p>
              {showJokeAnswer ? (
                <p className="text-sm text-muted-foreground mt-2 italic">{joke.a}</p>
              ) : (
                <button
                  onClick={() => setShowJokeAnswer(true)}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Show answer
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Small Talk Topic */}
        <Card className="card-warm p-5 bg-orange-50/50 border-orange-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h3 className="text-sm font-semibold mb-1">Dinner Table Topic</h3>
              <p className="text-sm text-muted-foreground italic">"{topic}"</p>
            </div>
          </div>
        </Card>

        {/* News placeholder */}
        <Card className="card-warm p-5 bg-slate-50/50 border-slate-100">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📰</span>
            <div>
              <h3 className="text-sm font-semibold mb-1">Daily Digest</h3>
              <p className="text-sm text-muted-foreground">Daily news digest coming soon — stay tuned!</p>
            </div>
          </div>
        </Card>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Link to="/prep">
            <Button variant="outline"><ClipboardList className="mr-2 h-4 w-4" /> Prep</Button>
          </Link>
          <Link to="/household">
            <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Settings</Button>
          </Link>
        </div>
      </motion.div>
    </AppLayout>
  );
}

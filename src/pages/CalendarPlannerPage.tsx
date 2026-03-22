import { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, GraduationCap, PartyPopper, School, Sparkles, Users } from 'lucide-react';

import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const GROUP_OPTIONS = ['Meals', 'Activities', 'Other'] as const;
const ACTIVITY_CATEGORIES = [
  { label: 'Social engagements', icon: PartyPopper },
  { label: 'Classes', icon: GraduationCap },
  { label: 'School events / exams', icon: School },
] as const;

export default function CalendarPlannerPage() {
  const [calendarText, setCalendarText] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([...GROUP_OPTIONS]);

  const previewLines = useMemo(
    () => calendarText.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8),
    [calendarText]
  );

  const toggleGroup = (group: string) => {
    setSelectedGroups(current =>
      current.includes(group) ? current.filter(item => item !== group) : [...current, group]
    );
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wide">V4 Calendar Planning</Badge>
          <h1 className="text-3xl font-bold">Plan the family calendar for the whole week</h1>
          <p className="text-muted-foreground max-w-2xl">
            Paste the week once, organize it into meals, activities, and other items, then sync the right events to each family member.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.9fr]">
          <Card className="card-warm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Weekly Input</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste your weekly calendar in plain text. We&apos;ll use this page to sort events into meals, activities, and prep.
            </p>
            <Textarea
              value={calendarText}
              onChange={e => setCalendarText(e.target.value)}
              rows={14}
              className="text-sm font-mono"
              placeholder={`Monday
8:00 AM School assembly
4:30 PM Tennis class - Kid 1
7:00 PM Dinner with grandparents

Tuesday
Math exam - Kid 2
6:00 PM Piano class`}
            />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Planner groups</p>
              <div className="flex flex-wrap gap-2">
                {GROUP_OPTIONS.map(group => (
                  <Button
                    key={group}
                    type="button"
                    variant={selectedGroups.includes(group) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGroup(group)}
                  >
                    {group}
                  </Button>
                ))}
              </div>
            </div>
            <Button size="lg" className="w-full" disabled>
              Week organizer coming next
            </Button>
          </Card>

          <div className="space-y-4">
            <Card className="card-warm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Sync goals</h2>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Each weekly sync will route activities to:</p>
                <p>Kid 1, Kid 2, Parent 1, Parent 2</p>
                <p>Prep activities go to both parents by default.</p>
              </div>
            </Card>

            <Card className="card-warm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Activity categories</h2>
              </div>
              <div className="space-y-3">
                {ACTIVITY_CATEGORIES.map(category => (
                  <div key={category.label} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <category.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{category.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="card-warm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Input preview</h2>
              </div>
              {previewLines.length > 0 ? (
                <div className="space-y-2">
                  {previewLines.map((line, index) => (
                    <div key={`${line}-${index}`} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Your pasted week will preview here.</p>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, ClipboardList, Settings, UtensilsCrossed } from 'lucide-react';
import { getMonday, formatWeekLabel } from '@/lib/dateUtils';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { household, familyMembers, recipes, weeklyPlans, mealSlots } = useAppContext();
  const today = new Date();
  const monday = getMonday(today);
  const plannedMeals = mealSlots.filter(s => s.recipeIds.length > 0).length;

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

        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/planner">
            <Card className="card-warm-hover p-6 h-full">
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
          <Link to="/calendar-planner">
            <Card className="card-warm-hover p-6 h-full">
              <div className="space-y-4">
                <div className="inline-flex rounded-2xl bg-secondary p-3">
                  <Calendar className="h-7 w-7 text-secondary-foreground" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">Calendar Planning</h2>
                  <p className="text-sm text-muted-foreground">
                    Paste the family week, organize classes and school events, then sync the right people to the right calendars.
                  </p>
                </div>
                <Button variant="outline" className="w-full justify-between">
                  Open Calendar Planner <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Family</h3>
            <p className="mt-2 text-3xl font-bold">{familyMembers.length}</p>
            <p className="text-sm text-muted-foreground">People set up in this household</p>
          </Card>
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Recipes</h3>
            <p className="mt-2 text-3xl font-bold">{recipes.length}</p>
            <p className="text-sm text-muted-foreground">Dishes available for meal planning</p>
          </Card>
          <Card className="card-warm p-5">
            <h3 className="text-sm font-medium text-muted-foreground">Planned Meals</h3>
            <p className="mt-2 text-3xl font-bold">{plannedMeals}</p>
            <p className="text-sm text-muted-foreground">Meal slots already filled</p>
          </Card>
        </div>

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

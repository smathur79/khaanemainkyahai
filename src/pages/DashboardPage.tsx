import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, Sparkles, ChefHat, Clock, Heart, Users, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { getMonday, formatWeekLabel, formatDateKey } from '@/lib/dateUtils';
import { DAYS_OF_WEEK } from '@/types/models';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { household, familyMembers, recipes, weeklyPlans, mealSlots } = useAppContext();
  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const currentPlan = weeklyPlans.find(p => p.weekStartDate === weekKey);
  const currentSlots = currentPlan ? mealSlots.filter(s => s.weeklyPlanId === currentPlan.id) : [];
  const filledSlots = currentSlots.filter(s => s.recipeIds.length > 0);
  const totalSlots = 21;
  const favoriteRecipes = recipes.filter(r => r.favorite);

  // Setup checklist
  const hasMembers = familyMembers.length > 0;
  const hasRecipes = recipes.length > 0;
  const hasPlan = !!currentPlan && filledSlots.length > 0;
  const setupComplete = hasMembers && hasRecipes && hasPlan;
  const setupSteps = [
    { done: hasMembers, label: 'Add family members', href: '/household', cta: 'Add members' },
    { done: hasRecipes, label: 'Add your first recipe', href: '/recipes', cta: 'Add recipe' },
    { done: hasPlan, label: 'Plan this week', href: '/planner', cta: 'Start planning' },
  ];
  const incompleteSteps = setupSteps.filter(s => !s.done);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{household?.name || 'Dashboard'}</h1>
          <p className="text-muted-foreground mt-1">{formatWeekLabel(monday)}</p>
        </div>

        {/* Setup checklist — shown until all steps done */}
        {!setupComplete && (
          <Card className="card-warm p-5 border-primary/20 bg-primary/5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span>Get started</span>
              <Badge variant="outline" className="text-xs">{setupSteps.filter(s => s.done).length}/{setupSteps.length} done</Badge>
            </h2>
            <div className="space-y-2">
              {setupSteps.map(step => (
                <div key={step.label} className="flex items-center gap-3">
                  {step.done
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  }
                  <span className={`text-sm flex-1 ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                    {step.label}
                  </span>
                  {!step.done && (
                    <Link to={step.href}>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        {step.cta} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/planner">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="font-semibold text-sm">Plan This Week</div>
            </Card>
          </Link>
          <Link to="/recipes">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <BookOpen className="h-8 w-8 mx-auto text-secondary-foreground mb-2" />
              <div className="font-semibold text-sm">Recipe Library</div>
            </Card>
          </Link>
          <Link to="/generate">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <Sparkles className="h-8 w-8 mx-auto text-accent-foreground mb-2" />
              <div className="font-semibold text-sm">AI Recipes</div>
            </Card>
          </Link>
          <Link to="/shortlist">
            <Card className="card-warm-hover p-4 text-center cursor-pointer">
              <ChefHat className="h-8 w-8 mx-auto text-primary mb-2" />
              <div className="font-semibold text-sm">Discover</div>
            </Card>
          </Link>
        </div>

        {/* This Week Snapshot */}
        <Card className="card-warm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">This Week</h2>
            <Badge variant={currentPlan?.status === 'finalized' ? 'default' : 'outline'}>
              {currentPlan ? (currentPlan.status === 'finalized' ? 'Finalized' : 'Draft') : 'Not started'}
            </Badge>
          </div>
          {currentPlan ? (
            <div>
              <div className="text-sm text-muted-foreground mb-3">
                {filledSlots.length} of {totalSlots} meals planned
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(filledSlots.length / totalSlots) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs text-center">
                {DAYS_OF_WEEK.map(day => {
                  const daySlots = currentSlots.filter(s => s.dayOfWeek === day);
                  const filled = daySlots.filter(s => s.recipeIds.length > 0).length;
                  return (
                    <div key={day} className="space-y-0.5">
                      <div className="font-medium text-muted-foreground">{day.slice(0, 3)}</div>
                      <div className={`text-xs font-semibold ${filled === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {filled}/3
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No plan for this week yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {recipes.length === 0
                    ? 'Add some recipes first, then come back to plan your week.'
                    : 'Start filling in your meals for the week.'}
                </p>
              </div>
              <Link to="/planner">
                <Button size="sm">Start Planning</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Family & Favorites */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-warm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Family</h2>
              </div>
              {familyMembers.length === 0 && (
                <Link to="/household">
                  <Button size="sm" variant="ghost" className="h-7 text-xs">Add members</Button>
                </Link>
              )}
            </div>
            {familyMembers.length > 0 ? (
              <div className="space-y-2">
                {familyMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">{m.label}</Badge>
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">· {m.foodType}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No family members added yet.</p>
            )}
          </Card>

          <Card className="card-warm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Favorites</h2>
            </div>
            {favoriteRecipes.length > 0 ? (
              <div className="space-y-1.5">
                {favoriteRecipes.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.prepTimeMinutes}m</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>No favourites yet.</p>
                {recipes.length > 0 && (
                  <p className="text-xs">Tap the heart on any recipe to save it here.</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </motion.div>
    </AppLayout>
  );
}

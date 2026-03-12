import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MealType, PLANNER_MEAL_TYPES, DAYS_OF_WEEK } from '@/types/models';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import { getRecommendations } from '@/lib/recommendations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThumbsUp, ThumbsDown, Clock, Eye, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ShortlistPage() {
  const { recipes, familyMembers, addSwipeDecision, getSwipeDecisions } = useAppContext();
  const [mealFilter, setMealFilter] = useState<MealType>('lunch');
  const weekKey = formatDateKey(getMonday(new Date()));
  const decisions = getSwipeDecisions(weekKey);
  const decidedIds = new Set(decisions.map(d => d.recipeId));

  const suggestions = useMemo(() => {
    const recs = getRecommendations(recipes, familyMembers, mealFilter, DAYS_OF_WEEK[0], [], 50);
    return recs.filter(r => !decidedIds.has(r.recipe.id));
  }, [recipes, familyMembers, mealFilter, decidedIds.size]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailRecipe, setDetailRecipe] = useState<typeof suggestions[0] | null>(null);

  const current = suggestions[currentIndex];
  const likedCount = decisions.filter(d => d.mealType === mealFilter && d.decision === 'liked').length;

  const handleDecision = (decision: 'liked' | 'skipped') => {
    if (!current) return;
    addSwipeDecision({ weekStartDate: weekKey, recipeId: current.recipe.id, mealType: mealFilter, decision });
    if (decision === 'liked') toast.success(`${current.recipe.title} shortlisted!`);
    setCurrentIndex(prev => prev + 1);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) handleDecision('liked');
    else if (info.offset.x < -100) handleDecision('skipped');
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Discover Meals</h1>
          <p className="text-sm text-muted-foreground">Swipe right to shortlist, left to skip</p>
        </div>

        <div className="flex justify-center gap-2">
          {PLANNER_MEAL_TYPES.map(m => (
            <Button
              key={m}
              variant={mealFilter === m ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
              onClick={() => { setMealFilter(m); setCurrentIndex(0); }}
            >
              {m}
            </Button>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <Check className="inline h-3 w-3 mr-1" /> {likedCount} shortlisted for {mealFilter}
        </div>

        <div className="relative h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.recipe.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute w-full cursor-grab active:cursor-grabbing"
              >
                <Card className="card-warm p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <h2 className="text-xl font-bold">{current.recipe.title}</h2>
                    <Badge variant="secondary" className="text-xs capitalize">{current.recipe.foodType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{current.recipe.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {current.recipe.mealTypes.map(m => <Badge key={m} variant="outline" className="text-xs capitalize">{m}</Badge>)}
                    <Badge variant="secondary" className="text-xs">{current.recipe.cuisine}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{current.recipe.healthTag}</Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> {current.recipe.prepTimeMinutes} min · <span className="capitalize">{current.recipe.effort}</span>
                  </div>

                  {/* Reasons */}
                  <div className="space-y-1">
                    {current.reasons.map((r, i) => (
                      <div key={i} className="text-xs text-primary bg-primary/10 rounded-lg px-2 py-1 inline-block mr-1">
                        {r}
                      </div>
                    ))}
                  </div>

                  {/* Ingredient preview */}
                  <div className="text-xs text-muted-foreground">
                    <strong>Ingredients:</strong> {current.recipe.ingredients.slice(0, 5).join(', ')}
                    {current.recipe.ingredients.length > 5 && ` +${current.recipe.ingredients.length - 5} more`}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <Button variant="outline" size="lg" className="rounded-full h-14 w-14" onClick={() => handleDecision('skipped')}>
                      <ThumbsDown className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDetailRecipe(current)}>
                      <Eye className="h-4 w-4 mr-1" /> Details
                    </Button>
                    <Button size="lg" className="rounded-full h-14 w-14" onClick={() => handleDecision('liked')}>
                      <ThumbsUp className="h-6 w-6" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <p className="text-muted-foreground">No more suggestions for {mealFilter}!</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different meal type or add more recipes.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Detail dialog */}
        <Dialog open={!!detailRecipe} onOpenChange={() => setDetailRecipe(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{detailRecipe?.recipe.title}</DialogTitle>
            </DialogHeader>
            {detailRecipe && (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{detailRecipe.recipe.description}</p>
                <div><strong>Ingredients:</strong></div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {detailRecipe.recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
                <div><strong>Instructions:</strong></div>
                <p className="text-muted-foreground">{detailRecipe.recipe.instructions}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}

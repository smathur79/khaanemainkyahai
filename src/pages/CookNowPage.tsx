import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Recipe, CUISINES, RECIPE_FOOD_TYPES } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Clock, Search, ChefHat, Plus, CalendarPlus } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function CookNowPage() {
  const { recipes } = useAppContext();
  const [ingredientInput, setIngredientInput] = useState('');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const userIngredients = useMemo(() =>
    ingredientInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    [ingredientInput]
  );

  const suggestions = useMemo(() => {
    if (userIngredients.length === 0) return [];

    return recipes
      .filter(r => !r.isLinkOnly)
      .map(r => {
        const matched = userIngredients.filter(ing =>
          r.ingredients.some(ri => ri.toLowerCase().includes(ing))
        );
        const missing = r.ingredients.filter(ri =>
          !userIngredients.some(ing => ri.toLowerCase().includes(ing))
        );
        return { recipe: r, matched, missing, matchCount: matched.length };
      })
      .filter(s => s.matchCount > 0)
      .filter(s => {
        if (timeFilter === 'under15' && s.recipe.prepTimeMinutes > 15) return false;
        if (timeFilter === 'under30' && s.recipe.prepTimeMinutes > 30) return false;
        if (cuisineFilter !== 'all' && s.recipe.cuisine !== cuisineFilter) return false;
        if (foodTypeFilter !== 'all' && s.recipe.foodType !== foodTypeFilter) return false;
        if (healthFilter === 'healthy' && s.recipe.healthTag !== 'healthy') return false;
        if (healthFilter === 'kidFriendly' && s.recipe.moodTag !== 'kid-friendly') return false;
        return true;
      })
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 20);
  }, [recipes, userIngredients, timeFilter, cuisineFilter, foodTypeFilter, healthFilter]);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Cook Now</h1>
          <p className="text-sm text-muted-foreground">Tell us what you have, we'll suggest what to make</p>
        </div>

        <Card className="card-warm p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">What ingredients do you have?</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. chicken, onion, tomato, rice"
                value={ingredientInput}
                onChange={e => setIngredientInput(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {['all', 'under15', 'under30'].map(t => (
              <Badge key={t} variant={timeFilter === t ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTimeFilter(t)}>
                {t === 'all' ? 'Any time' : t === 'under15' ? '< 15 min' : '< 30 min'}
              </Badge>
            ))}
            {['all', 'healthy', 'kidFriendly'].map(h => (
              <Badge key={h} variant={healthFilter === h ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setHealthFilter(h)}>
                {h === 'all' ? 'All' : h === 'healthy' ? '🥗 Healthy' : '👶 Kid-Friendly'}
              </Badge>
            ))}
          </div>
        </Card>

        {userIngredients.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              {suggestions.length > 0 ? `${suggestions.length} suggestions` : 'No matches found'}
            </h2>
            {suggestions.map(({ recipe, matched, missing }) => (
              <Card key={recipe.id} className="card-warm-hover p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{recipe.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes} min
                      <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{recipe.foodType}</Badge>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{matched.length} match{matched.length !== 1 ? 'es' : ''}</Badge>
                </div>
                <div className="text-xs">
                  <span className="text-primary font-medium">You have: </span>
                  {matched.join(', ')}
                </div>
                {missing.length > 0 && missing.length <= 5 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Also need: </span>
                    {missing.slice(0, 5).join(', ')}
                  </div>
                )}
              </Card>
            ))}
            {suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Try adding more ingredients or adjusting filters.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

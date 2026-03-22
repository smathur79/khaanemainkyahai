import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Recipe, CUISINES, RECIPE_FOOD_TYPES, DAYS_OF_WEEK, PLANNER_MEAL_TYPES, DayOfWeek } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Clock, Search, ChefHat } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMonday, formatDateKey } from '@/lib/dateUtils';
import AppLayout from '@/components/AppLayout';
import RecipeDetailSheet from '@/components/RecipeDetailSheet';
import { motion } from 'framer-motion';

export default function CookNowPage() {
  const { recipes, weeklyPlans, mealSlots } = useAppContext();
  const [ingredientInput, setIngredientInput] = useState('');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Today's planned meals
  const today = new Date();
  const monday = getMonday(today);
  const weekKey = formatDateKey(monday);
  const todayDayIndex = (today.getDay() + 6) % 7; // Mon=0
  const todayDay: DayOfWeek = DAYS_OF_WEEK[todayDayIndex];
  const currentPlan = weeklyPlans.find(p => p.weekStartDate === weekKey);

  const todayMeals = useMemo(() => {
    if (!currentPlan) return [];
    const todaySlots = mealSlots.filter(
      s => s.weeklyPlanId === currentPlan.id && s.dayOfWeek === todayDay
    );
    return PLANNER_MEAL_TYPES.map(meal => {
      const slot = todaySlots.find(s => s.mealType === meal);
      const slotRecipes = slot
        ? slot.recipeIds.map(id => recipes.find(r => r.id === id)).filter(Boolean)
        : [];
      return { meal, recipes: slotRecipes as typeof recipes };
    }).filter(m => m.recipes.length > 0);
  }, [currentPlan, mealSlots, todayDay, recipes]);

  // Ingredient search
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
      .slice(0, 12);
  }, [userIngredients, recipes, timeFilter, cuisineFilter, foodTypeFilter, healthFilter]);

  const openDetail = (recipe: Recipe) => {
    setDetailRecipe(recipe);
    setShowDetail(true);
  };

  const mealIcon = (meal: string) => {
    if (meal === 'breakfast') return '🌅';
    if (meal === 'lunch') return '☀️';
    if (meal === 'dinner') return '🌙';
    return '🍽️';
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Cook Now</h1>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Today's planned meals */}
        {todayMeals.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              On the plan today
            </h2>
            <div className="space-y-2">
              {todayMeals.map(({ meal, recipes: mealRecipes }) => (
                <div key={meal} className="space-y-1">
                  {mealRecipes.map(recipe => (
                    <Card
                      key={recipe.id}
                      className="card-warm-hover p-4 cursor-pointer"
                      onClick={() => openDetail(recipe)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{mealIcon(meal)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground capitalize">
                              {meal}
                            </span>
                          </div>
                          <div className="font-semibold text-sm">{recipe.title}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {recipe.prepTimeMinutes} min · <span className="capitalize">{recipe.effort}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">View recipe →</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {todayMeals.length === 0 && (
          <Card className="card-warm p-5 text-center">
            <ChefHat className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No meals planned for today</p>
            <p className="text-xs text-muted-foreground mt-1">Search by ingredients below to find something to cook</p>
          </Card>
        )}

        {/* Ingredient search */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Search by ingredients
          </h2>
          <Card className="card-warm p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. paneer, tomatoes, spinach"
                value={ingredientInput}
                onChange={e => setIngredientInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="under15">Under 15 min</SelectItem>
                  <SelectItem value="under30">Under 30 min</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Cuisine" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cuisines</SelectItem>
                  {CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Food type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {RECIPE_FOOD_TYPES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Health" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="kidFriendly">Kid-friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        {/* Ingredient results */}
        {userIngredients.length > 0 && (
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No recipes found with those ingredients. Try different combinations.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{suggestions.length} match{suggestions.length !== 1 ? 'es' : ''}</p>
                {suggestions.map(({ recipe, matched, missing }) => (
                  <Card
                    key={recipe.id}
                    className="card-warm-hover p-4 cursor-pointer"
                    onClick={() => openDetail(recipe)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">{recipe.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes}m
                          <span className="capitalize">· {recipe.cuisine}</span>
                        </div>
                        <div className="space-y-1">
                          {matched.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {matched.map(ing => (
                                <Badge key={ing} className="text-xs bg-green-500/10 text-green-700 border-green-200 border">
                                  ✓ {ing}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {missing.length > 0 && missing.length <= 4 && (
                            <p className="text-xs text-muted-foreground">
                              Also needs: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? '…' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {matched.length} match{matched.length !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        <RecipeDetailSheet
          recipe={detailRecipe}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
      </motion.div>
    </AppLayout>
  );
}

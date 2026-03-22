import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Recipe, MealType, CUISINES, RECIPE_FOOD_TYPES, MEAL_TYPES, HEALTH_TAGS, EFFORT_LEVELS, MOOD_TAGS } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Clock, Search, Plus, Pencil, Trash2, Grid3X3, List, BookOpen, Sparkles } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import RecipeFormDialog from '@/components/RecipeFormDialog';
import RecipeDetailSheet from '@/components/RecipeDetailSheet';
import { motion } from 'framer-motion';

export default function RecipeLibraryPage() {
  const { recipes, toggleFavorite, deleteRecipe } = useAppContext();
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [effortFilter, setEffortFilter] = useState<string>('all');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
        !r.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) &&
        !(r.subCuisine || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (mealFilter !== 'all' && !r.mealTypes.includes(mealFilter as MealType)) return false;
      if (cuisineFilter !== 'all' && r.cuisine !== cuisineFilter) return false;
      if (foodTypeFilter !== 'all' && r.foodType !== foodTypeFilter) return false;
      if (healthFilter !== 'all' && r.healthTag !== healthFilter) return false;
      if (effortFilter !== 'all' && r.effort !== effortFilter) return false;
      if (moodFilter !== 'all' && r.moodTag !== moodFilter) return false;
      if (favOnly && !r.favorite) return false;
      return true;
    });
  }, [recipes, search, mealFilter, cuisineFilter, foodTypeFilter, healthFilter, effortFilter, moodFilter, favOnly]);

  const openDetail = (recipe: Recipe) => {
    setDetailRecipe(recipe);
    setShowDetail(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  // Empty library state
  if (recipes.length === 0) {
    return (
      <AppLayout>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Recipe Library</h1>
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">No recipes yet</h2>
              <p className="text-muted-foreground max-w-sm">
                Add your family's favourite dishes, or let AI suggest recipes tailored to your tastes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => { setEditingRecipe(null); setShowForm(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add your first recipe
              </Button>
              <Link to="/generate">
                <Button variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" /> Try AI generator
                </Button>
              </Link>
            </div>
          </div>
          <RecipeFormDialog open={showForm} onOpenChange={setShowForm} recipe={editingRecipe} />
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recipe Library</h1>
          <Button onClick={() => { setEditingRecipe(null); setShowForm(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Recipe
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={mealFilter} onValueChange={setMealFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Meal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All meals</SelectItem>
              {MEAL_TYPES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Cuisine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cuisines</SelectItem>
              {CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Food type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {RECIPE_FOOD_TYPES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Health" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {HEALTH_TAGS.map(h => <SelectItem key={h} value={h} className="capitalize">{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={effortFilter} onValueChange={setEffortFilter}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="Effort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {EFFORT_LEVELS.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={moodFilter} onValueChange={setMoodFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Mood" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All moods</SelectItem>
              {MOOD_TAGS.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={favOnly ? 'default' : 'outline'} size="icon" onClick={() => setFavOnly(!favOnly)}>
            <Heart className={`h-4 w-4 ${favOnly ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">{filtered.length} recipe{filtered.length !== 1 ? 's' : ''}</div>

        {/* No results after filtering */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium">No recipes match your filters</p>
            <p className="text-sm text-muted-foreground">Try clearing some filters or adding a new recipe.</p>
            <Button variant="outline" size="sm" onClick={() => {
              setSearch(''); setMealFilter('all'); setCuisineFilter('all');
              setFoodTypeFilter('all'); setHealthFilter('all'); setEffortFilter('all');
              setMoodFilter('all'); setFavOnly(false);
            }}>Clear filters</Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <Card
                key={recipe.id}
                className="card-warm-hover p-4 flex flex-col cursor-pointer"
                onClick={() => openDetail(recipe)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-base leading-tight">{recipe.title}</h3>
                  <button
                    className="ml-2 flex-shrink-0"
                    onClick={e => { e.stopPropagation(); toggleFavorite(recipe.id); }}
                  >
                    <Heart className={`h-4 w-4 ${recipe.favorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.mealTypes.map(m => <Badge key={m} variant="outline" className="text-xs capitalize">{m}</Badge>)}
                  <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{recipe.foodType}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes}m · <span className="capitalize">{recipe.effort}</span>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(recipe)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecipe(recipe.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(recipe => (
              <Card
                key={recipe.id}
                className="card-warm-hover p-3 flex items-center gap-3 cursor-pointer"
                onClick={() => openDetail(recipe)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{recipe.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {recipe.cuisine} · <span className="capitalize">{recipe.foodType}</span> · {recipe.prepTimeMinutes}m · <span className="capitalize">{recipe.effort}</span>
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => toggleFavorite(recipe.id)}>
                    <Heart className={`h-4 w-4 ${recipe.favorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(recipe)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRecipe(recipe.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <RecipeFormDialog open={showForm} onOpenChange={setShowForm} recipe={editingRecipe} />
        <RecipeDetailSheet
          recipe={detailRecipe}
          open={showDetail}
          onOpenChange={setShowDetail}
          onEdit={handleEdit}
        />
      </motion.div>
    </AppLayout>
  );
}

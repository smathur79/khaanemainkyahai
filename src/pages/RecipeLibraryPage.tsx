import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Recipe, MealType, CUISINES, FOOD_TYPES, MEAL_TYPES } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Clock, Search, Plus, Pencil, Trash2, Grid3X3, List } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import RecipeFormDialog from '@/components/RecipeFormDialog';
import { motion } from 'framer-motion';

export default function RecipeLibraryPage() {
  const { recipes, toggleFavorite, deleteRecipe } = useAppContext();
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>('all');
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    return recipes.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
      if (mealFilter !== 'all' && !r.mealTypes.includes(mealFilter as MealType)) return false;
      if (cuisineFilter !== 'all' && r.cuisine !== cuisineFilter) return false;
      if (foodTypeFilter !== 'all' && r.foodType !== foodTypeFilter) return false;
      if (favOnly && !r.favorite) return false;
      return true;
    });
  }, [recipes, search, mealFilter, cuisineFilter, foodTypeFilter, favOnly]);

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
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Meal type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All meals</SelectItem>
              {MEAL_TYPES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Cuisine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cuisines</SelectItem>
              {CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Food type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {FOOD_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={favOnly ? 'default' : 'outline'} size="icon" onClick={() => setFavOnly(!favOnly)}>
            <Heart className={`h-4 w-4 ${favOnly ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No recipes found. Try adjusting your filters or add a new recipe.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(recipe => (
              <Card key={recipe.id} className="card-warm-hover p-4 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-base leading-tight">{recipe.title}</h3>
                  <button onClick={() => toggleFavorite(recipe.id)} className="ml-2 flex-shrink-0">
                    <Heart className={`h-4 w-4 ${recipe.favorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.mealTypes.map(m => <Badge key={m} variant="outline" className="text-xs capitalize">{m}</Badge>)}
                  <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
                  <Badge variant="secondary" className="text-xs">{recipe.foodType}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes}m · {recipe.difficulty}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRecipe(recipe); setShowForm(true); }}>
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
              <Card key={recipe.id} className="card-warm-hover p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{recipe.title}</div>
                  <div className="text-xs text-muted-foreground">{recipe.cuisine} · {recipe.foodType} · {recipe.prepTimeMinutes}m</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleFavorite(recipe.id)}>
                    <Heart className={`h-4 w-4 ${recipe.favorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRecipe(recipe); setShowForm(true); }}>
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
      </motion.div>
    </AppLayout>
  );
}

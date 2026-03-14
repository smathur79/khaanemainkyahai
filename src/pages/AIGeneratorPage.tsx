import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MealType, MEAL_TYPES, CUISINES } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Save, Loader2, Clock, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedRecipe {
  title: string;
  description: string;
  mealTypes: MealType[];
  cuisine: string;
  subCuisine?: string;
  foodType: string;
  healthTag: string;
  effort: string;
  moodTag: string;
  prepTimeMinutes: number;
  difficulty: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
  kidFriendly?: boolean;
  highProtein?: boolean;
}

export default function AIGeneratorPage() {
  const { addRecipe, familyMembers } = useAppContext();
  const [cuisine, setCuisine] = useState('Indian');
  const [mealType, setMealType] = useState<string>('lunch');
  const [ingredients, setIngredients] = useState('');
  const [maxPrepTime, setMaxPrepTime] = useState('30');
  const [count, setCount] = useState('3');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedRecipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    setLoading(true);
    setSavedIds(new Set());
    try {
      const familyPreferences = familyMembers.map(m =>
        `${m.name} (${m.label}): ${m.foodType}, likes ${m.likes.join(', ') || 'anything'}, dislikes ${m.dislikes.join(', ') || 'nothing'}, spice: ${m.spiceLevel}`
      ).join('; ');

      const { data, error } = await supabase.functions.invoke('generate-recipes', {
        body: { cuisine, mealType, ingredients, maxPrepTime: parseInt(maxPrepTime), count: parseInt(count), familyPreferences },
      });

      if (error) throw error;
      setResults(data?.recipes ?? []);
      if ((data?.recipes ?? []).length === 0) {
        toast.error('No recipes generated. Try different parameters.');
      }
    } catch (e: any) {
      toast.error('Failed to generate recipes. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (recipe: GeneratedRecipe, index: number) => {
    addRecipe({
      title: recipe.title,
      description: recipe.description,
      mealTypes: recipe.mealTypes,
      cuisine: recipe.cuisine,
      subCuisine: recipe.subCuisine ?? '',
      foodType: (recipe.foodType as any) ?? 'vegetarian',
      healthTag: (recipe.healthTag as any) ?? 'balanced',
      effort: (recipe.effort as any) ?? 'medium',
      moodTag: recipe.moodTag ?? 'comfort',
      prepTimeMinutes: recipe.prepTimeMinutes ?? 30,
      difficulty: (recipe.difficulty as any) ?? 'Easy',
      ingredients: recipe.ingredients ?? [],
      instructions: recipe.instructions ?? '',
      tags: [...(recipe.tags ?? []), 'ai-generated'],
      favorite: false,
      source: 'ai',
      sourceName: 'AI Generated',
      sourceLink: '',
      isLinkOnly: false,
      kidFriendly: recipe.kidFriendly ?? false,
      highProtein: recipe.highProtein ?? false,
    });
    setSavedIds(prev => new Set(prev).add(index));
    toast.success(`${recipe.title} saved to your library!`);
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">AI Recipe Generator</h1>
          <p className="text-sm text-muted-foreground">Get real recipe ideas tailored to your family</p>
        </div>

        <Card className="card-warm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Cuisine or Style</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Available Ingredients (optional)</Label>
              <Input placeholder="e.g. paneer, tomatoes, rice" value={ingredients} onChange={e => setIngredients(e.target.value)} />
            </div>
            <div>
              <Label>Max Prep Time (min)</Label>
              <Input type="number" value={maxPrepTime} onChange={e => setMaxPrepTime(e.target.value)} />
            </div>
            <div>
              <Label>Number of Recipes</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleGenerate} className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating with AI...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Recipes</>}
          </Button>
        </Card>

        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Generated Recipes</h2>
            {results.map((recipe, idx) => (
              <Card key={idx} className="card-warm-hover p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{recipe.title}</h3>
                  <Button
                    size="sm"
                    variant={savedIds.has(idx) ? 'secondary' : 'default'}
                    onClick={() => handleSave(recipe, idx)}
                    disabled={savedIds.has(idx)}
                  >
                    {savedIds.has(idx) ? <><Check className="mr-1 h-3 w-3" /> Saved</> : <><Save className="mr-1 h-3 w-3" /> Save</>}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{recipe.description}</p>
                <div className="flex flex-wrap gap-1">
                  {recipe.mealTypes?.map(m => <Badge key={m} variant="outline" className="text-xs capitalize">{m}</Badge>)}
                  <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
                  <Badge variant="secondary" className="text-xs capitalize">{recipe.foodType}</Badge>
                  {recipe.healthTag && <Badge variant="outline" className="text-xs capitalize">{recipe.healthTag}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes} min · {recipe.difficulty}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Ingredients:</strong> {recipe.ingredients?.join(', ')}
                </div>
                {recipe.instructions && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Instructions:</strong> {recipe.instructions}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

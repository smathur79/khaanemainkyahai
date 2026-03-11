import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { MealType, MEAL_TYPES, CUISINES, Recipe } from '@/types/models';
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

interface GeneratedRecipe {
  title: string;
  description: string;
  mealTypes: MealType[];
  cuisine: string;
  foodType: string;
  prepTimeMinutes: number;
  difficulty: string;
  ingredients: string[];
  instructions: string;
  tags: string[];
}

// Mock AI generation for V1 (no backend yet)
function generateMockRecipes(cuisine: string, mealType: string, ingredients: string, maxPrepTime: number, count: number): GeneratedRecipe[] {
  const templates: GeneratedRecipe[] = [
    {
      title: `${cuisine} Style ${mealType === 'breakfast' ? 'Morning Bowl' : mealType === 'lunch' ? 'Power Bowl' : 'Comfort Bowl'}`,
      description: `A delicious ${cuisine.toLowerCase()}-inspired ${mealType} bowl packed with flavor and nutrition.`,
      mealTypes: [mealType as MealType],
      cuisine,
      foodType: 'Vegetarian',
      prepTimeMinutes: Math.min(maxPrepTime, 25),
      difficulty: 'Easy',
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : ['Rice', 'Mixed vegetables', 'Spices', 'Fresh herbs'],
      instructions: `Prepare the base ingredients. Cook with ${cuisine.toLowerCase()} spices and seasonings. Assemble in a bowl and garnish with fresh herbs.`,
      tags: ['ai-generated', cuisine.toLowerCase(), mealType],
    },
    {
      title: `Quick ${cuisine} ${mealType === 'breakfast' ? 'Toast' : mealType === 'lunch' ? 'Wrap' : 'Stir-fry'}`,
      description: `A quick and easy ${cuisine.toLowerCase()} ${mealType} that comes together in minutes.`,
      mealTypes: [mealType as MealType],
      cuisine,
      foodType: 'Vegetarian',
      prepTimeMinutes: Math.min(maxPrepTime, 15),
      difficulty: 'Easy',
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : ['Bread/Tortilla', 'Fresh vegetables', 'Cheese', 'Seasoning'],
      instructions: `Heat your base. Add fillings with ${cuisine.toLowerCase()} flavors. Serve hot.`,
      tags: ['ai-generated', 'quick', mealType],
    },
    {
      title: `${cuisine} Spiced ${mealType === 'breakfast' ? 'Pancakes' : mealType === 'lunch' ? 'Salad' : 'Curry'}`,
      description: `${cuisine} flavors meet comfort food in this delightful ${mealType} recipe.`,
      mealTypes: [mealType as MealType],
      cuisine,
      foodType: 'Vegetarian',
      prepTimeMinutes: Math.min(maxPrepTime, 30),
      difficulty: 'Medium',
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : ['Main protein/grain', 'Onion', 'Tomato', 'Spice blend', 'Oil'],
      instructions: `Prepare the ${cuisine.toLowerCase()} spice base. Cook the main ingredient. Combine and let flavors meld. Serve with accompaniments.`,
      tags: ['ai-generated', 'flavorful', mealType],
    },
    {
      title: `Hearty ${cuisine} ${mealType === 'breakfast' ? 'Hash' : mealType === 'lunch' ? 'Soup' : 'One-pot'}`,
      description: `A hearty, warming ${mealType} with ${cuisine.toLowerCase()} influence.`,
      mealTypes: [mealType as MealType],
      cuisine,
      foodType: 'Vegetarian',
      prepTimeMinutes: Math.min(maxPrepTime, 35),
      difficulty: 'Easy',
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : ['Potatoes/Lentils', 'Mixed vegetables', 'Broth', 'Herbs', 'Salt'],
      instructions: `Sauté aromatics. Add vegetables and liquid. Season with ${cuisine.toLowerCase()} spices. Simmer until tender.`,
      tags: ['ai-generated', 'hearty', 'comfort-food'],
    },
    {
      title: `${cuisine} Fusion ${mealType === 'breakfast' ? 'Smoothie Bowl' : mealType === 'lunch' ? 'Rice Bowl' : 'Pasta'}`,
      description: `A creative fusion dish combining ${cuisine.toLowerCase()} flavors with modern cooking.`,
      mealTypes: [mealType as MealType],
      cuisine,
      foodType: 'Vegetarian',
      prepTimeMinutes: Math.min(maxPrepTime, 20),
      difficulty: 'Easy',
      ingredients: ingredients ? ingredients.split(',').map(s => s.trim()) : ['Base grain/noodles', 'Protein', 'Sauce', 'Garnish'],
      instructions: `Cook the base. Prepare the ${cuisine.toLowerCase()}-inspired sauce. Combine and top with fresh garnishes.`,
      tags: ['ai-generated', 'fusion', 'creative'],
    },
  ];

  return templates.slice(0, count);
}

export default function AIGeneratorPage() {
  const { addRecipe } = useAppContext();
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
    // Simulate AI delay
    await new Promise(r => setTimeout(r, 1500));
    const generated = generateMockRecipes(cuisine, mealType, ingredients, parseInt(maxPrepTime) || 30, parseInt(count) || 3);
    setResults(generated);
    setLoading(false);
  };

  const handleSave = (recipe: GeneratedRecipe, index: number) => {
    addRecipe({
      ...recipe,
      foodType: recipe.foodType as any,
      difficulty: recipe.difficulty as any,
      favorite: false,
      source: 'ai',
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
          <p className="text-sm text-muted-foreground">Get recipe ideas tailored to your preferences</p>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Recipes</>}
          </Button>
        </Card>

        {/* Results */}
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
                  <Badge variant="outline" className="text-xs capitalize">{recipe.mealTypes[0]}</Badge>
                  <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
                  <Badge variant="secondary" className="text-xs">{recipe.foodType}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes} min · {recipe.difficulty}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}

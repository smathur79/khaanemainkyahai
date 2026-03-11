import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Recipe, MealType, FoodType, Difficulty, MEAL_TYPES, CUISINES, FOOD_TYPES } from '@/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export default function RecipeFormDialog({ open, onOpenChange, recipe }: Props) {
  const { addRecipe, updateRecipe } = useAppContext();
  const isEdit = !!recipe;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mealTypes, setMealTypes] = useState<MealType[]>(['lunch']);
  const [cuisine, setCuisine] = useState('Indian');
  const [foodType, setFoodType] = useState<FoodType>('Vegetarian');
  const [prepTime, setPrepTime] = useState('30');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tags, setTags] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description);
      setMealTypes(recipe.mealTypes);
      setCuisine(recipe.cuisine);
      setFoodType(recipe.foodType);
      setPrepTime(String(recipe.prepTimeMinutes));
      setDifficulty(recipe.difficulty);
      setIngredients(recipe.ingredients.join(', '));
      setInstructions(recipe.instructions);
      setTags(recipe.tags.join(', '));
      setFavorite(recipe.favorite);
    } else {
      setTitle(''); setDescription(''); setMealTypes(['lunch']); setCuisine('Indian');
      setFoodType('Vegetarian'); setPrepTime('30'); setDifficulty('Easy');
      setIngredients(''); setInstructions(''); setTags(''); setFavorite(false); setNotes('');
    }
  }, [recipe, open]);

  const toggleMealType = (mt: MealType) => {
    setMealTypes(prev => prev.includes(mt) ? prev.filter(m => m !== mt) : [...prev, mt]);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      description,
      mealTypes,
      cuisine,
      foodType,
      prepTimeMinutes: parseInt(prepTime) || 30,
      difficulty,
      ingredients: ingredients.split(',').map(s => s.trim()).filter(Boolean),
      instructions,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      favorite,
      source: 'manual' as const,
    };
    if (isEdit) {
      updateRecipe(recipe.id, data);
    } else {
      addRecipe(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Recipe' : 'Add Recipe'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Dish Name</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Paneer Tikka" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="mb-1 block">Meal Type</Label>
            <div className="flex gap-1.5">
              {MEAL_TYPES.map(mt => (
                <Badge key={mt} variant={mealTypes.includes(mt) ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => toggleMealType(mt)}>
                  {mt}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cuisine</Label>
              <Select value={cuisine} onValueChange={setCuisine}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Food Type</Label>
              <Select value={foodType} onValueChange={v => setFoodType(v as FoodType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FOOD_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prep Time (min)</Label>
              <Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Ingredients (comma separated)</Label>
            <Textarea value={ingredients} onChange={e => setIngredients(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. quick, healthy" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={favorite} onCheckedChange={setFavorite} />
            <Label>Favorite</Label>
          </div>
          <Button onClick={handleSubmit} className="w-full">{isEdit ? 'Update Recipe' : 'Add Recipe'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

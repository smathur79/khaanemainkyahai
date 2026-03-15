import { forwardRef } from 'react';
import { Recipe } from '@/types/models';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat } from 'lucide-react';

interface Props {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RecipeViewSheet = forwardRef<HTMLDivElement, Props>(function RecipeViewSheet({ recipe, open, onOpenChange }, ref) {
  if (!recipe) return null;

  const hasRecipeText = recipe.instructions && recipe.instructions.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{recipe.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">{recipe.cuisine}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{recipe.foodType}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{recipe.effort}</Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
              <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes} min
            </div>
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted-foreground">{recipe.description}</p>
          )}

          {/* Recipe text — the main content */}
          {hasRecipeText ? (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">How to make</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{recipe.instructions}</div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">No recipe added yet</p>
            </div>
          )}

          {/* Ingredients if present */}
          {recipe.ingredients && recipe.ingredients.length > 0 && recipe.ingredients[0] !== '' && (
            <div>
              <p className="text-sm font-semibold mb-1">Ingredients</p>
              <div className="text-sm text-muted-foreground">{recipe.ingredients.join(', ')}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default RecipeViewSheet;

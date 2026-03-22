import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Recipe } from '@/types/models';
import { Clock, Flame, Heart, Pencil, ExternalLink } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

interface RecipeDetailSheetProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (recipe: Recipe) => void;
}

export default function RecipeDetailSheet({ recipe, open, onOpenChange, onEdit }: RecipeDetailSheetProps) {
  const { toggleFavorite } = useAppContext();

  if (!recipe) return null;

  const effortColor = {
    quick: 'bg-green-500/10 text-green-700 border-green-200',
    medium: 'bg-amber-500/10 text-amber-700 border-amber-200',
    weekend: 'bg-rose-500/10 text-rose-700 border-rose-200',
  }[recipe.effort] ?? '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-left leading-snug pr-2">{recipe.title}</SheetTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleFavorite(recipe.id)}
              >
                <Heart className={`h-4 w-4 ${recipe.favorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
              </Button>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => { onOpenChange(false); onEdit(recipe); }}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            {recipe.prepTimeMinutes > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {recipe.prepTimeMinutes} min
              </Badge>
            )}
            <Badge variant="outline" className={effortColor}>
              <Flame className="h-3 w-3 mr-1" />
              {recipe.effort}
            </Badge>
            <Badge variant="outline" className="capitalize">{recipe.difficulty}</Badge>
            <Badge variant="outline" className="capitalize">{recipe.cuisine}</Badge>
            {recipe.mealTypes.map(m => (
              <Badge key={m} variant="secondary" className="capitalize">{m}</Badge>
            ))}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
          )}

          {/* Link-only */}
          {recipe.isLinkOnly && recipe.sourceLink && (
            <a
              href={recipe.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> View recipe
            </a>
          )}

          {/* Ingredients */}
          {recipe.ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && !recipe.isLinkOnly && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Instructions</h3>
              <div className="space-y-2">
                {recipe.instructions
                  .split(/\.\s+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{step}.</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

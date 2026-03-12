import { Recipe, FamilyMember, MealType, DAYS_OF_WEEK, DayOfWeek } from '@/types/models';

interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  reasons: string[];
}

// Map family member food type to compatible recipe food types
function isFoodTypeCompatible(memberFoodType: string, recipeFoodType: string): boolean {
  switch (memberFoodType) {
    case 'Vegan':
      return recipeFoodType === 'vegan';
    case 'Vegetarian':
      return recipeFoodType === 'vegan' || recipeFoodType === 'vegetarian';
    case 'Eggetarian':
      return recipeFoodType === 'vegan' || recipeFoodType === 'vegetarian' || recipeFoodType === 'egg';
    case 'Non-Vegetarian':
      return true; // eats everything
    default:
      return true;
  }
}

export function scoreRecipe(
  recipe: Recipe,
  members: FamilyMember[],
  mealType: MealType,
  dayOfWeek: DayOfWeek,
  usedRecipeIds: string[] = [],
  favoriteIds: string[] = [],
): ScoredRecipe {
  let score = 0;
  const reasons: string[] = [];

  // Must match meal type
  if (!recipe.mealTypes.includes(mealType)) {
    return { recipe, score: -1000, reasons: ['Wrong meal type'] };
  }

  // Skip link-only recipes
  if (recipe.isLinkOnly) {
    return { recipe, score: -1000, reasons: ['Link-only recipe'] };
  }

  // Exclude if violates any exclusions
  for (const member of members) {
    for (const excl of member.exclusions) {
      if (recipe.ingredients.some(i => i.toLowerCase().includes(excl.toLowerCase())) ||
          recipe.tags.some(t => t.toLowerCase().includes(excl.toLowerCase()))) {
        return { recipe, score: -1000, reasons: [`Excluded: ${excl} (${member.name})`] };
      }
    }
  }

  // Food type compatibility — check against strictest member
  const strictMembers = members.filter(m => m.foodType === 'Vegan' || m.foodType === 'Vegetarian');
  for (const member of strictMembers) {
    if (!isFoodTypeCompatible(member.foodType, recipe.foodType)) {
      score -= 50;
    }
  }

  // Preference matching
  let prefMatches = 0;
  for (const member of members) {
    for (const like of member.likes) {
      if (recipe.title.toLowerCase().includes(like.toLowerCase()) ||
          recipe.tags.some(t => t.toLowerCase().includes(like.toLowerCase())) ||
          recipe.ingredients.some(i => i.toLowerCase().includes(like.toLowerCase()))) {
        prefMatches++;
      }
    }
    for (const dislike of member.dislikes) {
      if (recipe.title.toLowerCase().includes(dislike.toLowerCase()) ||
          recipe.ingredients.some(i => i.toLowerCase().includes(dislike.toLowerCase()))) {
        score -= 20;
      }
    }
    if (member.preferredCuisines.some(c => c.toLowerCase() === recipe.cuisine.toLowerCase())) {
      score += 15;
    }
  }
  if (prefMatches > 0) {
    score += prefMatches * 10;
    reasons.push(`Matches ${prefMatches} family preference${prefMatches > 1 ? 's' : ''}`);
  }

  // Cuisine preference
  const cuisineLovers = members.filter(m => m.preferredCuisines.some(c => c.toLowerCase() === recipe.cuisine.toLowerCase()));
  if (cuisineLovers.length > 0) {
    reasons.push(`Popular cuisine for your household`);
  }

  // Favorite bonus
  if (recipe.favorite || favoriteIds.includes(recipe.id)) {
    score += 20;
    reasons.push('Family favorite');
  }

  // Avoid repetition
  if (usedRecipeIds.includes(recipe.id)) {
    score -= 30;
  }

  // Weekday preference for quick meals
  const weekdayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);
  if (weekdayIndex < 5 && recipe.effort === 'quick') {
    score += 10;
    reasons.push('Quick weekday option');
  }

  // Weekend bonus for weekend-effort recipes
  if (weekdayIndex >= 5 && recipe.effort === 'weekend') {
    score += 10;
    reasons.push('Perfect for the weekend');
  }

  if (reasons.length === 0) {
    reasons.push('Good match for your family');
  }

  return { recipe, score, reasons };
}

export function getRecommendations(
  recipes: Recipe[],
  members: FamilyMember[],
  mealType: MealType,
  dayOfWeek: DayOfWeek,
  usedRecipeIds: string[] = [],
  limit = 10,
): ScoredRecipe[] {
  return recipes
    .map(r => scoreRecipe(r, members, mealType, dayOfWeek, usedRecipeIds))
    .filter(s => s.score > -1000)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

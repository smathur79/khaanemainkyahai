export type MemberLabel = 'Parent' | 'Kid' | 'Other';
export type FoodType = 'Vegetarian' | 'Eggetarian' | 'Non-Vegetarian' | 'Vegan' | 'Other';
export type SpiceLevel = 'Low' | 'Medium' | 'High';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'smoothie' | 'dessert';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type RecipeSource = 'manual' | 'ai';
export type PlanStatus = 'draft' | 'finalized';
export type SwipeDecisionType = 'liked' | 'skipped';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// New recipe-specific classification types
export type RecipeFoodType = 'vegan' | 'vegetarian' | 'egg' | 'chicken' | 'fish';
export type HealthTag = 'healthy' | 'balanced' | 'indulgent';
export type Effort = 'quick' | 'medium' | 'weekend';
export type MoodTag = 'comfort' | 'light' | 'kid-friendly' | 'adventurous' | 'hearty' | 'refreshing';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Meal types used in the weekly planner grid (core 3) */
export const PLANNER_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
/** All meal types for filtering and categorization */
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie', 'dessert'];
export const CUISINES = [
  'Indian', 'Italian', 'Chinese', 'Mexican', 'Continental', 'Mediterranean',
  'Thai', 'Japanese', 'American', 'Middle Eastern', 'Korean', 'Global', 'Other',
];
export const FOOD_TYPES: FoodType[] = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Vegan', 'Other'];
export const RECIPE_FOOD_TYPES: RecipeFoodType[] = ['vegan', 'vegetarian', 'egg', 'chicken', 'fish'];
export const HEALTH_TAGS: HealthTag[] = ['healthy', 'balanced', 'indulgent'];
export const EFFORT_LEVELS: Effort[] = ['quick', 'medium', 'weekend'];
export const MOOD_TAGS: MoodTag[] = ['comfort', 'light', 'kid-friendly', 'adventurous', 'hearty', 'refreshing'];

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  householdId: string;
  name: string;
  label: MemberLabel;
  foodType: FoodType;
  likes: string[];
  dislikes: string[];
  exclusions: string[];
  spiceLevel: SpiceLevel;
  preferredCuisines: string[];
  notes: string;
}

export interface Recipe {
  id: string;
  householdId: string;
  title: string;
  description: string;
  mealTypes: MealType[];
  cuisine: string;
  subCuisine: string;
  foodType: RecipeFoodType;
  healthTag: HealthTag;
  effort: Effort;
  moodTag: MoodTag;
  prepTimeMinutes: number;
  difficulty: Difficulty;
  ingredients: string[];
  instructions: string;
  tags: string[];
  favorite: boolean;
  source: RecipeSource;
  sourceName: string;
  sourceLink: string;
  isLinkOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  householdId: string;
  weekStartDate: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyMealSlot {
  id: string;
  weeklyPlanId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  recipeIds: string[];
  notes: string;
}

export interface SwipeDecision {
  id: string;
  householdId: string;
  weekStartDate: string;
  recipeId: string;
  mealType: MealType;
  decision: SwipeDecisionType;
  createdAt: string;
}

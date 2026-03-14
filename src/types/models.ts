export type MemberLabel = 'Parent' | 'Kid' | 'Other';
export type FoodType = 'Vegetarian' | 'Eggetarian' | 'Non-Vegetarian' | 'Vegan' | 'Other';
export type SpiceLevel = 'Low' | 'Medium' | 'High';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'smoothie' | 'dessert';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type RecipeSource = 'manual' | 'ai' | 'seed';
export type PlanStatus = 'draft' | 'finalized';
export type SwipeDecisionType = 'liked' | 'skipped';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type EntryType = 'cooked' | 'order_in' | 'leftovers' | 'eat_out';
export type HouseholdRole = 'planner' | 'requestor_viewer';

// Recipe-specific classification types
export type RecipeFoodType = 'vegan' | 'vegetarian' | 'egg' | 'chicken' | 'fish';
export type HealthTag = 'healthy' | 'balanced' | 'indulgent';
export type Effort = 'quick' | 'medium' | 'weekend';
export type MoodTag = 'comfort' | 'light' | 'kid-friendly' | 'adventurous' | 'hearty' | 'refreshing';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const PLANNER_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
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
export const ENTRY_TYPES: EntryType[] = ['cooked', 'order_in', 'leftovers', 'eat_out'];

export interface Household {
  id: string;
  name: string;
  accessCode: string;
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
  kidFriendly: boolean;
  highProtein: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  householdId: string;
  weekStartDate: string;
  status: PlanStatus;
  isHistorical: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealSlotItem {
  id: string;
  recipeId: string | null;
  title: string;
  sortOrder: number;
  notes: string;
  portionNote: string;
}

export interface WeeklyMealSlot {
  id: string;
  weeklyPlanId: string;
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  entryType: EntryType;
  recipeIds: string[]; // computed from items for backward compat
  items: MealSlotItem[];
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

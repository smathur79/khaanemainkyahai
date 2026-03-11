export type MemberLabel = 'Parent' | 'Kid' | 'Other';
export type FoodType = 'Vegetarian' | 'Eggetarian' | 'Non-Vegetarian' | 'Vegan' | 'Other';
export type SpiceLevel = 'Low' | 'Medium' | 'High';
export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type RecipeSource = 'manual' | 'ai';
export type PlanStatus = 'draft' | 'finalized';
export type SwipeDecisionType = 'liked' | 'skipped';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
export const CUISINES = ['Indian', 'Italian', 'Chinese', 'Mexican', 'Continental', 'Mediterranean', 'Thai', 'Japanese', 'American', 'Other'];
export const FOOD_TYPES: FoodType[] = ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Vegan', 'Other'];

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
  foodType: FoodType;
  prepTimeMinutes: number;
  difficulty: Difficulty;
  ingredients: string[];
  instructions: string;
  tags: string[];
  favorite: boolean;
  source: RecipeSource;
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
  recipeId: string | null;
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

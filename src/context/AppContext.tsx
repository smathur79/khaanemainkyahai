import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Household, FamilyMember, Recipe, WeeklyPlan, WeeklyMealSlot, SwipeDecision, DayOfWeek, MealType, DAYS_OF_WEEK, PLANNER_MEAL_TYPES } from '@/types/models';
import { seedRecipes } from '@/data/seedRecipes';

function genId() {
  return crypto.randomUUID();
}

interface AppState {
  household: Household | null;
  familyMembers: FamilyMember[];
  recipes: Recipe[];
  weeklyPlans: WeeklyPlan[];
  mealSlots: WeeklyMealSlot[];
  swipeDecisions: SwipeDecision[];
}

interface AppContextType extends AppState {
  setupHousehold: (name: string) => string;
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'householdId'>) => void;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void;
  removeFamilyMember: (id: string) => void;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => string;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  createWeeklyPlan: (weekStartDate: string) => string;
  getWeeklyPlan: (weekStartDate: string) => WeeklyPlan | undefined;
  getMealSlots: (planId: string) => WeeklyMealSlot[];
  setMealSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeIds: string[], notes?: string) => void;
  addRecipeToSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => void;
  removeRecipeFromSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => void;
  reorderRecipeInSlot: (planId: string, day: DayOfWeek, meal: MealType, fromIndex: number, toIndex: number) => void;
  finalizePlan: (planId: string) => void;
  addSwipeDecision: (decision: Omit<SwipeDecision, 'id' | 'householdId' | 'createdAt'>) => void;
  getSwipeDecisions: (weekStartDate: string) => SwipeDecision[];
  clearSwipeDecisions: (weekStartDate: string) => void;
  isOnboarded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'family-meal-planner-state';

// Map old foodType values to new RecipeFoodType
function migrateFoodType(old: string): string {
  switch (old) {
    case 'Vegetarian': return 'vegetarian';
    case 'Vegan': return 'vegan';
    case 'Eggetarian': return 'egg';
    case 'Non-Vegetarian': return 'chicken';
    case 'Other': return 'vegetarian';
    default: return old;
  }
}

function loadState(): AppState {
  const empty: AppState = { household: null, familyMembers: [], recipes: [], weeklyPlans: [], mealSlots: [], swipeDecisions: [] };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      // Migrate old recipeId format to recipeIds array
      if (parsed.mealSlots) {
        parsed.mealSlots = parsed.mealSlots.map((s: any) => ({
          ...s,
          recipeIds: s.recipeIds ?? (s.recipeId ? [s.recipeId] : []),
        }));
      }
      // Migrate old recipe foodType and add new fields with defaults
      if (parsed.recipes) {
        parsed.recipes = parsed.recipes.map((r: any) => ({
          ...r,
          foodType: migrateFoodType(r.foodType),
          subCuisine: r.subCuisine ?? '',
          healthTag: r.healthTag ?? 'balanced',
          effort: r.effort ?? (r.prepTimeMinutes <= 15 ? 'quick' : r.prepTimeMinutes <= 30 ? 'medium' : 'weekend'),
          moodTag: r.moodTag ?? 'comfort',
          sourceName: r.sourceName ?? 'Seed Library',
          sourceLink: r.sourceLink ?? '',
          isLinkOnly: r.isLinkOnly ?? false,
        }));
      }
      return { ...empty, ...parsed };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return empty;
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const setupHousehold = useCallback((name: string) => {
    const hid = genId();
    const household: Household = { id: hid, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const recipes: Recipe[] = seedRecipes.map(r => ({ ...r, id: genId(), householdId: hid }));
    setState(prev => ({ ...prev, household, recipes }));
    return hid;
  }, []);

  const addFamilyMember = useCallback((member: Omit<FamilyMember, 'id' | 'householdId'>) => {
    setState(prev => {
      if (!prev.household) return prev;
      return { ...prev, familyMembers: [...prev.familyMembers, { ...member, id: genId(), householdId: prev.household.id }] };
    });
  }, []);

  const updateFamilyMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setState(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  }, []);

  const removeFamilyMember = useCallback((id: string) => {
    setState(prev => ({ ...prev, familyMembers: prev.familyMembers.filter(m => m.id !== id) }));
  }, []);

  const addRecipe = useCallback((recipe: Omit<Recipe, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => {
    const id = genId();
    setState(prev => {
      if (!prev.household) return prev;
      const now = new Date().toISOString();
      return { ...prev, recipes: [...prev.recipes, { ...recipe, id, householdId: prev.household.id, createdAt: now, updatedAt: now }] };
    });
    return id;
  }, []);

  const updateRecipe = useCallback((id: string, updates: Partial<Recipe>) => {
    setState(prev => ({
      ...prev,
      recipes: prev.recipes.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r),
    }));
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setState(prev => ({ ...prev, recipes: prev.recipes.filter(r => r.id !== id) }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      recipes: prev.recipes.map(r => r.id === id ? { ...r, favorite: !r.favorite, updatedAt: new Date().toISOString() } : r),
    }));
  }, []);

  const createWeeklyPlan = useCallback((weekStartDate: string) => {
    const id = genId();
    setState(prev => {
      if (!prev.household) return prev;
      const existing = prev.weeklyPlans.find(p => p.weekStartDate === weekStartDate);
      if (existing) return prev;
      const now = new Date().toISOString();
      const plan: WeeklyPlan = { id, householdId: prev.household.id, weekStartDate, status: 'draft', createdAt: now, updatedAt: now };
      const slots: WeeklyMealSlot[] = [];
      for (const day of DAYS_OF_WEEK) {
        for (const meal of PLANNER_MEAL_TYPES) {
          slots.push({ id: genId(), weeklyPlanId: id, dayOfWeek: day, mealType: meal, recipeIds: [], notes: '' });
        }
      }
      return { ...prev, weeklyPlans: [...prev.weeklyPlans, plan], mealSlots: [...prev.mealSlots, ...slots] };
    });
    return id;
  }, []);

  const getWeeklyPlan = useCallback((weekStartDate: string) => {
    return state.weeklyPlans.find(p => p.weekStartDate === weekStartDate);
  }, [state.weeklyPlans]);

  const getMealSlots = useCallback((planId: string) => {
    return state.mealSlots.filter(s => s.weeklyPlanId === planId);
  }, [state.mealSlots]);

  const setMealSlot = useCallback((planId: string, day: DayOfWeek, meal: MealType, recipeIds: string[], notes?: string) => {
    setState(prev => ({
      ...prev,
      mealSlots: prev.mealSlots.map(s =>
        s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal
          ? { ...s, recipeIds, notes: notes ?? s.notes }
          : s
      ),
    }));
  }, []);

  const addRecipeToSlot = useCallback((planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => {
    setState(prev => ({
      ...prev,
      mealSlots: prev.mealSlots.map(s =>
        s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal && !s.recipeIds.includes(recipeId)
          ? { ...s, recipeIds: [...s.recipeIds, recipeId] }
          : s
      ),
    }));
  }, []);

  const removeRecipeFromSlot = useCallback((planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => {
    setState(prev => ({
      ...prev,
      mealSlots: prev.mealSlots.map(s =>
        s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal
          ? { ...s, recipeIds: s.recipeIds.filter(id => id !== recipeId) }
          : s
      ),
    }));
  }, []);

  const reorderRecipeInSlot = useCallback((planId: string, day: DayOfWeek, meal: MealType, fromIndex: number, toIndex: number) => {
    setState(prev => ({
      ...prev,
      mealSlots: prev.mealSlots.map(s => {
        if (s.weeklyPlanId !== planId || s.dayOfWeek !== day || s.mealType !== meal) return s;
        const ids = [...s.recipeIds];
        const [moved] = ids.splice(fromIndex, 1);
        ids.splice(toIndex, 0, moved);
        return { ...s, recipeIds: ids };
      }),
    }));
  }, []);

  const finalizePlan = useCallback((planId: string) => {
    setState(prev => ({
      ...prev,
      weeklyPlans: prev.weeklyPlans.map(p => p.id === planId ? { ...p, status: 'finalized' as const, updatedAt: new Date().toISOString() } : p),
    }));
  }, []);

  const addSwipeDecision = useCallback((decision: Omit<SwipeDecision, 'id' | 'householdId' | 'createdAt'>) => {
    setState(prev => {
      if (!prev.household) return prev;
      return {
        ...prev,
        swipeDecisions: [...prev.swipeDecisions, { ...decision, id: genId(), householdId: prev.household.id, createdAt: new Date().toISOString() }],
      };
    });
  }, []);

  const getSwipeDecisions = useCallback((weekStartDate: string) => {
    return state.swipeDecisions.filter(d => d.weekStartDate === weekStartDate);
  }, [state.swipeDecisions]);

  const clearSwipeDecisions = useCallback((weekStartDate: string) => {
    setState(prev => ({
      ...prev,
      swipeDecisions: prev.swipeDecisions.filter(d => d.weekStartDate !== weekStartDate),
    }));
  }, []);

  const isOnboarded = state.household !== null && state.familyMembers.length > 0;

  return (
    <AppContext.Provider value={{
      ...state,
      setupHousehold,
      addFamilyMember,
      updateFamilyMember,
      removeFamilyMember,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      createWeeklyPlan,
      getWeeklyPlan,
      getMealSlots,
      setMealSlot,
      addRecipeToSlot,
      removeRecipeFromSlot,
      reorderRecipeInSlot,
      finalizePlan,
      addSwipeDecision,
      getSwipeDecisions,
      clearSwipeDecisions,
      isOnboarded,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

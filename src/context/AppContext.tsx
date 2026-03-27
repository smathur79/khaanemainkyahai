import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import {
  Household, FamilyMember, Recipe, WeeklyPlan, WeeklyMealSlot, MealSlotItem,
  SwipeDecision, FamilyEvent, EventCategory,
  DayOfWeek, MealType, EntryType,
  DAYS_OF_WEEK, PLANNER_MEAL_TYPES,
} from '@/types/models';
import { allSeedRecipes } from '@/data/recipes/index';

// ── helpers ──────────────────────────────────────────────
function toRecipe(r: any): Recipe {
  return {
    id: r.id,
    householdId: r.household_id,
    title: r.title,
    description: r.description,
    mealTypes: r.meal_types ?? [],
    cuisine: r.cuisine,
    subCuisine: r.sub_cuisine ?? '',
    foodType: r.food_type,
    healthTag: r.health_tag,
    effort: r.effort,
    moodTag: r.mood_tag,
    prepTimeMinutes: r.prep_time_minutes,
    difficulty: r.difficulty,
    ingredients: r.ingredients ?? [],
    instructions: r.instructions,
    tags: r.tags ?? [],
    favorite: r.favorite,
    source: r.source as any,
    sourceName: r.source_name,
    sourceLink: r.source_link,
    isLinkOnly: r.is_link_only,
    kidFriendly: r.kid_friendly ?? false,
    highProtein: r.high_protein ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toFamilyMember(m: any): FamilyMember {
  return {
    id: m.id,
    householdId: m.household_id,
    name: m.name,
    label: m.label,
    foodType: m.food_type,
    likes: m.likes ?? [],
    dislikes: m.dislikes ?? [],
    exclusions: m.exclusions ?? [],
    spiceLevel: m.spice_level,
    preferredCuisines: m.preferred_cuisines ?? [],
    notes: m.notes,
    calendarRole: (m.calendar_role ?? 'unassigned') as any,
    calendarEmail: m.calendar_email ?? '',
    receivesPrepSync: m.receives_prep_sync ?? false,
  };
}

function toSlot(s: any, items: any[]): WeeklyMealSlot {
  const slotItems: MealSlotItem[] = items
    .filter((i: any) => i.weekly_meal_slot_id === s.id)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((i: any) => ({
      id: i.id,
      recipeId: i.recipe_id,
      title: i.title,
      sortOrder: i.sort_order,
      notes: i.notes,
      portionNote: i.portion_note ?? '',
    }));

  return {
    id: s.id,
    weeklyPlanId: s.weekly_plan_id,
    dayOfWeek: s.day_of_week,
    mealType: s.meal_type,
    entryType: s.entry_type ?? 'cooked',
    recipeIds: slotItems.filter(i => i.recipeId).map(i => i.recipeId!),
    items: slotItems,
    notes: s.notes,
  };
}

function toFamilyEvent(e: any): FamilyEvent {
  return {
    id: e.id,
    householdId: e.household_id,
    title: e.title,
    eventDate: e.event_date,
    startTime: e.start_time ?? null,
    endTime: e.end_time ?? null,
    isAllDay: e.is_all_day ?? false,
    category: (e.category ?? 'other') as EventCategory,
    familyMemberId: e.family_member_id ?? null,
    location: e.location ?? null,
    isRecurring: e.is_recurring ?? false,
    recurrenceRule: e.recurrence_rule ?? null,
    travelTimeMinutes: e.travel_time_minutes ?? null,
    notes: e.notes ?? null,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

// ── context shape ────────────────────────────────────────
interface AppState {
  household: Household | null;
  familyMembers: FamilyMember[];
  recipes: Recipe[];
  weeklyPlans: WeeklyPlan[];
  mealSlots: WeeklyMealSlot[];
  swipeDecisions: SwipeDecision[];
  familyEvents: FamilyEvent[];
  dataLoading: boolean;
}

interface AppContextType extends AppState {
  setupHousehold: (name: string) => Promise<string>;
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'householdId'>) => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  createWeeklyPlan: (weekStartDate: string) => Promise<string>;
  getWeeklyPlan: (weekStartDate: string) => WeeklyPlan | undefined;
  getMealSlots: (planId: string) => WeeklyMealSlot[];
  setMealSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeIds: string[], notes?: string) => Promise<void>;
  addRecipeToSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => Promise<void>;
  removeRecipeFromSlot: (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => Promise<void>;
  reorderRecipeInSlot: (planId: string, day: DayOfWeek, meal: MealType, fromIndex: number, toIndex: number) => void;
  finalizePlan: (planId: string) => Promise<void>;
  addSwipeDecision: (decision: Omit<SwipeDecision, 'id' | 'householdId' | 'createdAt'>) => void;
  getSwipeDecisions: (weekStartDate: string) => SwipeDecision[];
  clearSwipeDecisions: (weekStartDate: string) => void;
  clearWeek: (planId: string) => Promise<void>;
  copyLastWeek: (currentWeekStart: string, previousWeekStart: string) => Promise<void>;
  addFamilyEvent: (event: Omit<FamilyEvent, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateFamilyEvent: (id: string, updates: Partial<FamilyEvent>) => Promise<void>;
  deleteFamilyEvent: (id: string) => Promise<void>;
  getEventsForDate: (date: string) => FamilyEvent[];
  getEventsForWeek: (weekStartDate: string) => FamilyEvent[];
  refreshData: () => Promise<void>;
  isOnboarded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  household: null,
  familyMembers: [],
  recipes: [],
  weeklyPlans: [],
  mealSlots: [],
  swipeDecisions: [],
  familyEvents: [],
  dataLoading: true,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { householdId, householdName, accessCode, createHousehold: authCreateHousehold } = useAuth();
  const [state, setState] = useState<AppState>(initialState);

  // ── load all data when householdId changes ─────────────
  const loadData = useCallback(async (hid: string) => {
    setState(prev => ({ ...prev, dataLoading: true }));

    const [
      { data: householdData },
      { data: membersData },
      { data: recipesData },
      { data: plansData },
      { data: eventsData },
    ] = await Promise.all([
      supabase.from('households').select('*').eq('id', hid).single(),
      supabase.from('family_members').select('*').eq('household_id', hid),
      supabase.from('recipes').select('*').eq('household_id', hid),
      supabase.from('weekly_plans').select('*').eq('household_id', hid),
      supabase.from('family_events').select('*').eq('household_id', hid).order('event_date'),
    ]);

    const planIds = (plansData ?? []).map((p: any) => p.id);
    let allSlots: any[] = [];
    let allItems: any[] = [];

    if (planIds.length > 0) {
      const { data: slotsData } = await supabase
        .from('weekly_meal_slots')
        .select('*')
        .in('weekly_plan_id', planIds);
      allSlots = slotsData ?? [];

      const slotIds = allSlots.map((s: any) => s.id);
      if (slotIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('weekly_meal_slot_items')
          .select('*')
          .in('weekly_meal_slot_id', slotIds);
        allItems = itemsData ?? [];
      }
    }

    const household: Household | null = householdData
      ? { id: householdData.id, name: householdData.name, accessCode: householdData.access_code, createdAt: householdData.created_at, updatedAt: householdData.updated_at }
      : null;

    setState({
      household,
      familyMembers: (membersData ?? []).map(toFamilyMember),
      recipes: (recipesData ?? []).map(toRecipe),
      weeklyPlans: (plansData ?? []).map((p: any) => ({
        id: p.id, householdId: p.household_id, weekStartDate: p.week_start_date,
        status: p.status, isHistorical: p.is_historical, createdAt: p.created_at, updatedAt: p.updated_at,
      })),
      mealSlots: allSlots.map((s: any) => toSlot(s, allItems)),
      familyEvents: (eventsData ?? []).map(toFamilyEvent),
      swipeDecisions: [],
      dataLoading: false,
    });
  }, []);

  useEffect(() => {
    if (householdId) {
      loadData(householdId);
    } else {
      setState(prev => ({ ...prev, household: null, familyMembers: [], recipes: [], weeklyPlans: [], mealSlots: [], familyEvents: [], dataLoading: false }));
    }
  }, [householdId, loadData]);

  const refreshData = useCallback(async () => {
    if (householdId) await loadData(householdId);
  }, [householdId, loadData]);

  // ── household setup (seeds recipes) ────────────────────
  const setupHousehold = useCallback(async (name: string) => {
    const hid = await authCreateHousehold(name);

    // Seed recipes
    const seedRows = allSeedRecipes.map(r => ({
      household_id: hid,
      title: r.title,
      description: r.description,
      meal_types: r.mealTypes,
      cuisine: r.cuisine,
      sub_cuisine: r.subCuisine ?? '',
      food_type: r.foodType as any,
      health_tag: r.healthTag as any,
      effort: r.effort as any,
      mood_tag: r.moodTag,
      prep_time_minutes: r.prepTimeMinutes,
      difficulty: r.difficulty as any,
      ingredients: r.ingredients,
      instructions: r.instructions,
      tags: r.tags,
      favorite: r.favorite,
      source: r.source ?? 'seed',
      source_name: r.sourceName,
      source_link: r.sourceLink ?? '',
      is_link_only: r.isLinkOnly,
      kid_friendly: (r as any).kidFriendly ?? false,
      high_protein: (r as any).highProtein ?? false,
    }));

    // Batch insert in chunks of 50
    for (let i = 0; i < seedRows.length; i += 50) {
      await supabase.from('recipes').insert(seedRows.slice(i, i + 50));
    }

    await loadData(hid);
    return hid;
  }, [authCreateHousehold, loadData]);

  // ── family members ─────────────────────────────────────
  const addFamilyMember = useCallback(async (member: Omit<FamilyMember, 'id' | 'householdId'>) => {
    if (!householdId) return;
    await supabase.from('family_members').insert({
      household_id: householdId,
      name: member.name,
      label: member.label as any,
      food_type: member.foodType as any,
      likes: member.likes,
      dislikes: member.dislikes,
      exclusions: member.exclusions,
      spice_level: member.spiceLevel as any,
      preferred_cuisines: member.preferredCuisines,
      notes: member.notes,
      calendar_role: member.calendarRole,
      calendar_email: member.calendarEmail,
      receives_prep_sync: member.receivesPrepSync,
    });
    await refreshData();
  }, [householdId, refreshData]);

  const updateFamilyMember = useCallback(async (id: string, updates: Partial<FamilyMember>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.foodType !== undefined) dbUpdates.food_type = updates.foodType;
    if (updates.likes !== undefined) dbUpdates.likes = updates.likes;
    if (updates.dislikes !== undefined) dbUpdates.dislikes = updates.dislikes;
    if (updates.exclusions !== undefined) dbUpdates.exclusions = updates.exclusions;
    if (updates.spiceLevel !== undefined) dbUpdates.spice_level = updates.spiceLevel;
    if (updates.preferredCuisines !== undefined) dbUpdates.preferred_cuisines = updates.preferredCuisines;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.calendarRole !== undefined) dbUpdates.calendar_role = updates.calendarRole;
    if (updates.calendarEmail !== undefined) dbUpdates.calendar_email = updates.calendarEmail;
    if (updates.receivesPrepSync !== undefined) dbUpdates.receives_prep_sync = updates.receivesPrepSync;
    await supabase.from('family_members').update(dbUpdates).eq('id', id);
    await refreshData();
  }, [refreshData]);

  const removeFamilyMember = useCallback(async (id: string) => {
    await supabase.from('family_members').delete().eq('id', id);
    await refreshData();
  }, [refreshData]);

  // ── recipes ────────────────────────────────────────────
  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => {
    if (!householdId) return '';
    const { data, error } = await supabase.from('recipes').insert({
      household_id: householdId,
      title: recipe.title,
      description: recipe.description,
      meal_types: recipe.mealTypes as any,
      cuisine: recipe.cuisine,
      sub_cuisine: recipe.subCuisine,
      food_type: recipe.foodType as any,
      health_tag: recipe.healthTag as any,
      effort: recipe.effort as any,
      mood_tag: recipe.moodTag,
      prep_time_minutes: recipe.prepTimeMinutes,
      difficulty: recipe.difficulty as any,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      tags: recipe.tags,
      favorite: recipe.favorite,
      source: recipe.source,
      source_name: recipe.sourceName,
      source_link: recipe.sourceLink,
      is_link_only: recipe.isLinkOnly,
      kid_friendly: recipe.kidFriendly ?? false,
      high_protein: recipe.highProtein ?? false,
    }).select('id').single();
    await refreshData();
    return data?.id ?? '';
  }, [householdId, refreshData]);

  const updateRecipe = useCallback(async (id: string, updates: Partial<Recipe>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.mealTypes !== undefined) dbUpdates.meal_types = updates.mealTypes;
    if (updates.cuisine !== undefined) dbUpdates.cuisine = updates.cuisine;
    if (updates.subCuisine !== undefined) dbUpdates.sub_cuisine = updates.subCuisine;
    if (updates.foodType !== undefined) dbUpdates.food_type = updates.foodType;
    if (updates.healthTag !== undefined) dbUpdates.health_tag = updates.healthTag;
    if (updates.effort !== undefined) dbUpdates.effort = updates.effort;
    if (updates.moodTag !== undefined) dbUpdates.mood_tag = updates.moodTag;
    if (updates.prepTimeMinutes !== undefined) dbUpdates.prep_time_minutes = updates.prepTimeMinutes;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.ingredients !== undefined) dbUpdates.ingredients = updates.ingredients;
    if (updates.instructions !== undefined) dbUpdates.instructions = updates.instructions;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.favorite !== undefined) dbUpdates.favorite = updates.favorite;
    if (updates.sourceName !== undefined) dbUpdates.source_name = updates.sourceName;
    if (updates.sourceLink !== undefined) dbUpdates.source_link = updates.sourceLink;
    if (updates.isLinkOnly !== undefined) dbUpdates.is_link_only = updates.isLinkOnly;
    await supabase.from('recipes').update(dbUpdates).eq('id', id);
    await refreshData();
  }, [refreshData]);

  const deleteRecipe = useCallback(async (id: string) => {
    await supabase.from('recipes').delete().eq('id', id);
    setState(prev => ({ ...prev, recipes: prev.recipes.filter(r => r.id !== id) }));
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const recipe = state.recipes.find(r => r.id === id);
    if (!recipe) return;
    const newFav = !recipe.favorite;
    // Optimistic update
    setState(prev => ({
      ...prev,
      recipes: prev.recipes.map(r => r.id === id ? { ...r, favorite: newFav } : r),
    }));
    await supabase.from('recipes').update({ favorite: newFav }).eq('id', id);
  }, [state.recipes]);

  // ── weekly plans ───────────────────────────────────────
  const createWeeklyPlan = useCallback(async (weekStartDate: string) => {
    if (!householdId) return '';
    const existing = state.weeklyPlans.find(p => p.weekStartDate === weekStartDate);
    if (existing) return existing.id;

    const { data: plan } = await supabase.from('weekly_plans').insert({
      household_id: householdId,
      week_start_date: weekStartDate,
      status: 'draft' as const,
    }).select().single();

    if (!plan) return '';

    // Create empty slots
    const slots = [];
    for (const day of DAYS_OF_WEEK) {
      for (const meal of PLANNER_MEAL_TYPES) {
        slots.push({
          weekly_plan_id: plan.id,
          day_of_week: day as any,
          meal_type: meal as any,
          entry_type: 'cooked' as const,
          notes: '',
        });
      }
    }
    await supabase.from('weekly_meal_slots').insert(slots);
    await refreshData();
    return plan.id;
  }, [householdId, state.weeklyPlans, refreshData]);

  const getWeeklyPlan = useCallback((weekStartDate: string) => {
    return state.weeklyPlans.find(p => p.weekStartDate === weekStartDate);
  }, [state.weeklyPlans]);

  const getMealSlots = useCallback((planId: string) => {
    return state.mealSlots.filter(s => s.weeklyPlanId === planId);
  }, [state.mealSlots]);

  // ── slot manipulation ─────────────────────────────────
  const setMealSlot = useCallback(async (planId: string, day: DayOfWeek, meal: MealType, recipeIds: string[], notes?: string) => {
    const slot = state.mealSlots.find(s => s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal);
    if (!slot) return;

    // Delete existing items
    await supabase.from('weekly_meal_slot_items').delete().eq('weekly_meal_slot_id', slot.id);

    // Insert new items
    if (recipeIds.length > 0) {
      const items = recipeIds.map((recipeId, idx) => ({
        weekly_meal_slot_id: slot.id,
        recipe_id: recipeId,
        title: state.recipes.find(r => r.id === recipeId)?.title ?? '',
        sort_order: idx,
      }));
      await supabase.from('weekly_meal_slot_items').insert(items);
    }

    if (notes !== undefined) {
      await supabase.from('weekly_meal_slots').update({ notes }).eq('id', slot.id);
    }

    await refreshData();
  }, [state.mealSlots, state.recipes, refreshData]);

  const addRecipeToSlot = useCallback(async (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => {
    const slot = state.mealSlots.find(s => s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal);
    if (!slot || slot.recipeIds.includes(recipeId)) return;

    await supabase.from('weekly_meal_slot_items').insert({
      weekly_meal_slot_id: slot.id,
      recipe_id: recipeId,
      title: state.recipes.find(r => r.id === recipeId)?.title ?? '',
      sort_order: slot.items.length,
    });
    await refreshData();
  }, [state.mealSlots, state.recipes, refreshData]);

  const removeRecipeFromSlot = useCallback(async (planId: string, day: DayOfWeek, meal: MealType, recipeId: string) => {
    const slot = state.mealSlots.find(s => s.weeklyPlanId === planId && s.dayOfWeek === day && s.mealType === meal);
    if (!slot) return;
    const item = slot.items.find(i => i.recipeId === recipeId);
    if (item) {
      await supabase.from('weekly_meal_slot_items').delete().eq('id', item.id);
      await refreshData();
    }
  }, [state.mealSlots, refreshData]);

  const reorderRecipeInSlot = useCallback((planId: string, day: DayOfWeek, meal: MealType, fromIndex: number, toIndex: number) => {
    // Optimistic local update; async DB update
    setState(prev => ({
      ...prev,
      mealSlots: prev.mealSlots.map(s => {
        if (s.weeklyPlanId !== planId || s.dayOfWeek !== day || s.mealType !== meal) return s;
        const ids = [...s.recipeIds];
        const items = [...s.items];
        const [movedId] = ids.splice(fromIndex, 1);
        ids.splice(toIndex, 0, movedId);
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        return { ...s, recipeIds: ids, items };
      }),
    }));
  }, []);

  const finalizePlan = useCallback(async (planId: string) => {
    await supabase.from('weekly_plans').update({ status: 'finalized' as const }).eq('id', planId);
    setState(prev => ({
      ...prev,
      weeklyPlans: prev.weeklyPlans.map(p => p.id === planId ? { ...p, status: 'finalized' as const } : p),
    }));
  }, []);

  // ── V2: clear week ────────────────────────────────────
  const clearWeek = useCallback(async (planId: string) => {
    const slots = state.mealSlots.filter(s => s.weeklyPlanId === planId);
    const slotIds = slots.map(s => s.id);
    if (slotIds.length > 0) {
      await supabase.from('weekly_meal_slot_items').delete().in('weekly_meal_slot_id', slotIds);
    }
    await refreshData();
  }, [state.mealSlots, refreshData]);

  // ── V2: copy last week ────────────────────────────────
  const copyLastWeek = useCallback(async (currentWeekStart: string, previousWeekStart: string) => {
    if (!householdId) return;

    const prevPlan = state.weeklyPlans.find(p => p.weekStartDate === previousWeekStart);
    if (!prevPlan) return;

    // Ensure current plan exists
    let currentPlan = state.weeklyPlans.find(p => p.weekStartDate === currentWeekStart);
    if (!currentPlan) {
      const id = await createWeeklyPlan(currentWeekStart);
      // Reload to get the new plan
      await refreshData();
      return; // Need to call again after plan is created
    }

    const prevSlots = state.mealSlots.filter(s => s.weeklyPlanId === prevPlan.id);
    const currentSlots = state.mealSlots.filter(s => s.weeklyPlanId === currentPlan!.id);

    for (const prevSlot of prevSlots) {
      if (prevSlot.recipeIds.length === 0) continue;
      const curSlot = currentSlots.find(s => s.dayOfWeek === prevSlot.dayOfWeek && s.mealType === prevSlot.mealType);
      if (!curSlot) continue;

      // Clear existing items
      await supabase.from('weekly_meal_slot_items').delete().eq('weekly_meal_slot_id', curSlot.id);

      // Copy items
      const items = prevSlot.items.map((item, idx) => ({
        weekly_meal_slot_id: curSlot.id,
        recipe_id: item.recipeId,
        title: item.title,
        sort_order: idx,
        notes: item.notes,
      }));
      if (items.length > 0) {
        await supabase.from('weekly_meal_slot_items').insert(items);
      }

      // Copy entry type
      await supabase.from('weekly_meal_slots').update({ entry_type: prevSlot.entryType as any, notes: prevSlot.notes }).eq('id', curSlot.id);
    }
    await refreshData();
  }, [householdId, state.weeklyPlans, state.mealSlots, createWeeklyPlan, refreshData]);

  // ── family events ─────────────────────────────────────
  const addFamilyEvent = useCallback(async (event: Omit<FamilyEvent, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>) => {
    if (!householdId) return '';
    const { data, error } = await supabase.from('family_events').insert({
      household_id: householdId,
      title: event.title,
      event_date: event.eventDate,
      start_time: event.startTime ?? null,
      end_time: event.endTime ?? null,
      is_all_day: event.isAllDay,
      category: event.category as any,
      family_member_id: event.familyMemberId ?? null,
      location: event.location ?? null,
      is_recurring: event.isRecurring,
      recurrence_rule: event.recurrenceRule ?? null,
      travel_time_minutes: event.travelTimeMinutes ?? null,
      notes: event.notes ?? null,
    }).select('id').single();
    await refreshData();
    return data?.id ?? '';
  }, [householdId, refreshData]);

  const updateFamilyEvent = useCallback(async (id: string, updates: Partial<FamilyEvent>) => {
    const db: any = {};
    if (updates.title !== undefined) db.title = updates.title;
    if (updates.eventDate !== undefined) db.event_date = updates.eventDate;
    if (updates.startTime !== undefined) db.start_time = updates.startTime;
    if (updates.endTime !== undefined) db.end_time = updates.endTime;
    if (updates.isAllDay !== undefined) db.is_all_day = updates.isAllDay;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.familyMemberId !== undefined) db.family_member_id = updates.familyMemberId;
    if (updates.location !== undefined) db.location = updates.location;
    if (updates.isRecurring !== undefined) db.is_recurring = updates.isRecurring;
    if (updates.recurrenceRule !== undefined) db.recurrence_rule = updates.recurrenceRule;
    if (updates.travelTimeMinutes !== undefined) db.travel_time_minutes = updates.travelTimeMinutes;
    if (updates.notes !== undefined) db.notes = updates.notes;
    await supabase.from('family_events').update(db).eq('id', id);
    await refreshData();
  }, [refreshData]);

  const deleteFamilyEvent = useCallback(async (id: string) => {
    await supabase.from('family_events').delete().eq('id', id);
    setState(prev => ({ ...prev, familyEvents: prev.familyEvents.filter(e => e.id !== id) }));
  }, []);

  const getEventsForDate = useCallback((date: string) => {
    return state.familyEvents.filter(e => e.eventDate === date);
  }, [state.familyEvents]);

  const getEventsForWeek = useCallback((weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    const startStr = weekStartDate;
    const endStr = end.toISOString().split('T')[0];
    return state.familyEvents.filter(e => e.eventDate >= startStr && e.eventDate <= endStr);
  }, [state.familyEvents]);

  // ── swipe decisions (local only for now) ───────────────
  const addSwipeDecision = useCallback((decision: Omit<SwipeDecision, 'id' | 'householdId' | 'createdAt'>) => {
    setState(prev => ({
      ...prev,
      swipeDecisions: [...prev.swipeDecisions, {
        ...decision,
        id: crypto.randomUUID(),
        householdId: householdId ?? '',
        createdAt: new Date().toISOString(),
      }],
    }));
  }, [householdId]);

  const getSwipeDecisions = useCallback((weekStartDate: string) => {
    return state.swipeDecisions.filter(d => d.weekStartDate === weekStartDate);
  }, [state.swipeDecisions]);

  const clearSwipeDecisions = useCallback((weekStartDate: string) => {
    setState(prev => ({
      ...prev,
      swipeDecisions: prev.swipeDecisions.filter(d => d.weekStartDate !== weekStartDate),
    }));
  }, []);

  const isOnboarded = householdId !== null;

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
      clearWeek,
      copyLastWeek,
      addFamilyEvent,
      updateFamilyEvent,
      deleteFamilyEvent,
      getEventsForDate,
      getEventsForWeek,
      refreshData,
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

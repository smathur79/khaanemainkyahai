
-- ============================================
-- V2 FAMILY MEAL PLANNER - FULL SCHEMA
-- ============================================

-- Enums
CREATE TYPE public.household_role AS ENUM ('planner', 'requestor_viewer');
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'smoothie', 'dessert');
CREATE TYPE public.day_of_week AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
CREATE TYPE public.plan_status AS ENUM ('draft', 'finalized');
CREATE TYPE public.entry_type AS ENUM ('cooked', 'order_in', 'leftovers', 'eat_out');
CREATE TYPE public.request_type AS ENUM ('meal_request', 'recipe_link', 'order_in_request');
CREATE TYPE public.request_status AS ENUM ('open', 'reviewed', 'added', 'dismissed');
CREATE TYPE public.ritual_type AS ENUM ('morning', 'night');
CREATE TYPE public.recipe_food_type AS ENUM ('vegan', 'vegetarian', 'egg', 'chicken', 'fish');
CREATE TYPE public.health_tag AS ENUM ('healthy', 'balanced', 'indulgent');
CREATE TYPE public.effort_level AS ENUM ('quick', 'medium', 'weekend');
CREATE TYPE public.difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE public.member_label AS ENUM ('Parent', 'Kid', 'Other');
CREATE TYPE public.food_type_pref AS ENUM ('Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Vegan', 'Other');
CREATE TYPE public.spice_level AS ENUM ('Low', 'Medium', 'High');

-- ============================================
-- UTILITY FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Generate a 6-char uppercase access code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substr(md5(random()::text), 1, 6));
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- 1. HOUSEHOLDS
-- ============================================
CREATE TABLE public.households (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  access_code TEXT NOT NULL DEFAULT public.generate_access_code(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX idx_households_access_code ON public.households(access_code);

-- ============================================
-- 2. PROFILES (minimal, auto-created on anon sign-in)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Family Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. HOUSEHOLD MEMBERSHIPS (roles live here)
-- ============================================
CREATE TABLE public.household_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role household_role NOT NULL DEFAULT 'requestor_viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
ALTER TABLE public.household_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check if user belongs to household
CREATE OR REPLACE FUNCTION public.user_in_household(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_memberships
    WHERE user_id = _user_id AND household_id = _household_id
  )
$$;

-- Helper: check if user is planner in household
CREATE OR REPLACE FUNCTION public.user_is_planner(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_memberships
    WHERE user_id = _user_id AND household_id = _household_id AND role = 'planner'
  )
$$;

-- Helper: get user's household_id
CREATE OR REPLACE FUNCTION public.get_user_household_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.household_memberships
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ============================================
-- 4. FAMILY MEMBERS
-- ============================================
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label member_label NOT NULL DEFAULT 'Other',
  food_type food_type_pref NOT NULL DEFAULT 'Vegetarian',
  likes TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  exclusions TEXT[] NOT NULL DEFAULT '{}',
  spice_level spice_level NOT NULL DEFAULT 'Medium',
  preferred_cuisines TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RECIPES
-- ============================================
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  meal_types meal_type[] NOT NULL DEFAULT '{}',
  cuisine TEXT NOT NULL DEFAULT 'Global',
  sub_cuisine TEXT NOT NULL DEFAULT '',
  food_type recipe_food_type NOT NULL DEFAULT 'vegetarian',
  health_tag health_tag NOT NULL DEFAULT 'balanced',
  effort effort_level NOT NULL DEFAULT 'medium',
  mood_tag TEXT NOT NULL DEFAULT 'comfort',
  prep_time_minutes INT NOT NULL DEFAULT 30,
  difficulty difficulty_level NOT NULL DEFAULT 'Easy',
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  source_name TEXT NOT NULL DEFAULT 'Seed Library',
  source_link TEXT NOT NULL DEFAULT '',
  is_link_only BOOLEAN NOT NULL DEFAULT false,
  kid_friendly BOOLEAN NOT NULL DEFAULT false,
  high_protein BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. WEEKLY PLANS
-- ============================================
CREATE TABLE public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  status plan_status NOT NULL DEFAULT 'draft',
  is_historical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_start_date)
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. WEEKLY MEAL SLOTS
-- ============================================
CREATE TABLE public.weekly_meal_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  meal_type meal_type NOT NULL,
  entry_type entry_type NOT NULL DEFAULT 'cooked',
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE (weekly_plan_id, day_of_week, meal_type)
);
ALTER TABLE public.weekly_meal_slots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. WEEKLY MEAL SLOT ITEMS (multi-dish support)
-- ============================================
CREATE TABLE public.weekly_meal_slot_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_meal_slot_id UUID NOT NULL REFERENCES public.weekly_meal_slots(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  portion_note TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.weekly_meal_slot_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. WEEKLY TEMPLATES
-- ============================================
CREATE TABLE public.weekly_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Template',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.weekly_template_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_template_id UUID NOT NULL REFERENCES public.weekly_templates(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  meal_type meal_type NOT NULL,
  entry_type entry_type NOT NULL DEFAULT 'cooked',
  notes TEXT NOT NULL DEFAULT '',
  UNIQUE (weekly_template_id, day_of_week, meal_type)
);
ALTER TABLE public.weekly_template_slots ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.weekly_template_slot_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_template_slot_id UUID NOT NULL REFERENCES public.weekly_template_slots(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.weekly_template_slot_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. MEAL REQUESTS
-- ============================================
CREATE TABLE public.meal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE,
  requested_day day_of_week,
  requested_meal_type meal_type,
  request_type request_type NOT NULL DEFAULT 'meal_request',
  text TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  status request_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. PREP NOTES
-- ============================================
CREATE TABLE public.prep_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  meal_type meal_type,
  text TEXT NOT NULL DEFAULT '',
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prep_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 12. RITUAL TEMPLATES
-- ============================================
CREATE TABLE public.ritual_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  ritual_type ritual_type NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ritual_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ritual_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ritual_template_id UUID NOT NULL REFERENCES public.ritual_templates(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.ritual_template_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_templates_updated_at
  BEFORE UPDATE ON public.weekly_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: users see/edit own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Households: members can view, planners can update
CREATE POLICY "Members can view household" ON public.households FOR SELECT
  USING (public.user_in_household(auth.uid(), id));
CREATE POLICY "Anyone can insert household" ON public.households FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Planners can update household" ON public.households FOR UPDATE
  USING (public.user_is_planner(auth.uid(), id));
-- Allow reading household by access_code for joining
CREATE POLICY "Anyone can read household by access code" ON public.households FOR SELECT
  USING (true);

-- Household memberships
CREATE POLICY "Members can view memberships" ON public.household_memberships FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Users can join household" ON public.household_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Planners can update memberships" ON public.household_memberships FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can remove members" ON public.household_memberships FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id) OR auth.uid() = user_id);

-- Family members: household scope
CREATE POLICY "Members can view family" ON public.family_members FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert family" ON public.family_members FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can update family" ON public.family_members FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete family" ON public.family_members FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

-- Recipes: household scope
CREATE POLICY "Members can view recipes" ON public.recipes FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert recipes" ON public.recipes FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can update recipes" ON public.recipes FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete recipes" ON public.recipes FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

-- Weekly plans: household scope
CREATE POLICY "Members can view plans" ON public.weekly_plans FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert plans" ON public.weekly_plans FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can update plans" ON public.weekly_plans FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete plans" ON public.weekly_plans FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

-- Weekly meal slots: through plan's household
CREATE POLICY "Members can view meal slots" ON public.weekly_meal_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    WHERE wp.id = weekly_plan_id AND public.user_in_household(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can insert meal slots" ON public.weekly_meal_slots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    WHERE wp.id = weekly_plan_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can update meal slots" ON public.weekly_meal_slots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    WHERE wp.id = weekly_plan_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can delete meal slots" ON public.weekly_meal_slots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    WHERE wp.id = weekly_plan_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));

-- Weekly meal slot items: through slot's plan's household
CREATE POLICY "Members can view slot items" ON public.weekly_meal_slot_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weekly_meal_slots wms
    JOIN public.weekly_plans wp ON wp.id = wms.weekly_plan_id
    WHERE wms.id = weekly_meal_slot_id AND public.user_in_household(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can insert slot items" ON public.weekly_meal_slot_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weekly_meal_slots wms
    JOIN public.weekly_plans wp ON wp.id = wms.weekly_plan_id
    WHERE wms.id = weekly_meal_slot_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can update slot items" ON public.weekly_meal_slot_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_meal_slots wms
    JOIN public.weekly_plans wp ON wp.id = wms.weekly_plan_id
    WHERE wms.id = weekly_meal_slot_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));
CREATE POLICY "Planners can delete slot items" ON public.weekly_meal_slot_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_meal_slots wms
    JOIN public.weekly_plans wp ON wp.id = wms.weekly_plan_id
    WHERE wms.id = weekly_meal_slot_id AND public.user_is_planner(auth.uid(), wp.household_id)
  ));

-- Templates: household scope
CREATE POLICY "Members can view templates" ON public.weekly_templates FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert templates" ON public.weekly_templates FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can update templates" ON public.weekly_templates FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete templates" ON public.weekly_templates FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

CREATE POLICY "Members can view template slots" ON public.weekly_template_slots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weekly_templates wt
    WHERE wt.id = weekly_template_id AND public.user_in_household(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can insert template slots" ON public.weekly_template_slots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weekly_templates wt
    WHERE wt.id = weekly_template_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can update template slots" ON public.weekly_template_slots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_templates wt
    WHERE wt.id = weekly_template_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can delete template slots" ON public.weekly_template_slots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_templates wt
    WHERE wt.id = weekly_template_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));

CREATE POLICY "Members can view template slot items" ON public.weekly_template_slot_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weekly_template_slot_items wtsi
    JOIN public.weekly_template_slots wts ON wts.id = wtsi.weekly_template_slot_id
    JOIN public.weekly_templates wt ON wt.id = wts.weekly_template_id
    WHERE public.user_in_household(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can insert template slot items" ON public.weekly_template_slot_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weekly_template_slots wts
    JOIN public.weekly_templates wt ON wt.id = wts.weekly_template_id
    WHERE wts.id = weekly_template_slot_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can update template slot items" ON public.weekly_template_slot_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_template_slots wts
    JOIN public.weekly_templates wt ON wt.id = wts.weekly_template_id
    WHERE wts.id = weekly_template_slot_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));
CREATE POLICY "Planners can delete template slot items" ON public.weekly_template_slot_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_template_slots wts
    JOIN public.weekly_templates wt ON wt.id = wts.weekly_template_id
    WHERE wts.id = weekly_template_slot_id AND public.user_is_planner(auth.uid(), wt.household_id)
  ));

-- Meal requests
CREATE POLICY "Members can view requests" ON public.meal_requests FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Members can create requests" ON public.meal_requests FOR INSERT
  WITH CHECK (public.user_in_household(auth.uid(), household_id) AND auth.uid() = created_by_user_id);
CREATE POLICY "Planners can update requests" ON public.meal_requests FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete requests" ON public.meal_requests FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

-- Prep notes
CREATE POLICY "Members can view prep notes" ON public.prep_notes FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert prep notes" ON public.prep_notes FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id) AND auth.uid() = created_by_user_id);
CREATE POLICY "Planners can update prep notes" ON public.prep_notes FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete prep notes" ON public.prep_notes FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

-- Rituals
CREATE POLICY "Members can view rituals" ON public.ritual_templates FOR SELECT
  USING (public.user_in_household(auth.uid(), household_id));
CREATE POLICY "Planners can insert rituals" ON public.ritual_templates FOR INSERT
  WITH CHECK (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can update rituals" ON public.ritual_templates FOR UPDATE
  USING (public.user_is_planner(auth.uid(), household_id));
CREATE POLICY "Planners can delete rituals" ON public.ritual_templates FOR DELETE
  USING (public.user_is_planner(auth.uid(), household_id));

CREATE POLICY "Members can view ritual items" ON public.ritual_template_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ritual_templates rt
    WHERE rt.id = ritual_template_id AND public.user_in_household(auth.uid(), rt.household_id)
  ));
CREATE POLICY "Planners can insert ritual items" ON public.ritual_template_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ritual_templates rt
    WHERE rt.id = ritual_template_id AND public.user_is_planner(auth.uid(), rt.household_id)
  ));
CREATE POLICY "Planners can update ritual items" ON public.ritual_template_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ritual_templates rt
    WHERE rt.id = ritual_template_id AND public.user_is_planner(auth.uid(), rt.household_id)
  ));
CREATE POLICY "Planners can delete ritual items" ON public.ritual_template_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ritual_templates rt
    WHERE rt.id = ritual_template_id AND public.user_is_planner(auth.uid(), rt.household_id)
  ));

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_memberships_user ON public.household_memberships(user_id);
CREATE INDEX idx_memberships_household ON public.household_memberships(household_id);
CREATE INDEX idx_family_household ON public.family_members(household_id);
CREATE INDEX idx_recipes_household ON public.recipes(household_id);
CREATE INDEX idx_plans_household ON public.weekly_plans(household_id);
CREATE INDEX idx_plans_week ON public.weekly_plans(week_start_date);
CREATE INDEX idx_slots_plan ON public.weekly_meal_slots(weekly_plan_id);
CREATE INDEX idx_slot_items_slot ON public.weekly_meal_slot_items(weekly_meal_slot_id);
CREATE INDEX idx_templates_household ON public.weekly_templates(household_id);
CREATE INDEX idx_requests_household ON public.meal_requests(household_id);
CREATE INDEX idx_prep_notes_plan ON public.prep_notes(weekly_plan_id);
CREATE INDEX idx_rituals_household ON public.ritual_templates(household_id);

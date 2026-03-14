
ALTER TABLE public.households ADD COLUMN planner_code text NOT NULL DEFAULT generate_access_code();

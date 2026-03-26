ALTER TABLE public.family_members
ADD COLUMN calendar_role TEXT NOT NULL DEFAULT 'unassigned',
ADD COLUMN calendar_email TEXT NOT NULL DEFAULT '',
ADD COLUMN receives_prep_sync BOOLEAN NOT NULL DEFAULT false;

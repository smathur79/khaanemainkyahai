-- Add family_events table for V4 Family Calendar feature

CREATE TYPE event_category AS ENUM ('medical', 'school', 'activity', 'social', 'travel', 'other');

CREATE TABLE family_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  category event_category DEFAULT 'other',
  family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  location TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  travel_time_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE family_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their household"
  ON family_events FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM household_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert events in their household"
  ON family_events FOR INSERT
  WITH CHECK (household_id IN (
    SELECT household_id FROM household_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update events in their household"
  ON family_events FOR UPDATE
  USING (household_id IN (
    SELECT household_id FROM household_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete events in their household"
  ON family_events FOR DELETE
  USING (household_id IN (
    SELECT household_id FROM household_memberships WHERE user_id = auth.uid()
  ));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_family_events_updated_at
  BEFORE UPDATE ON family_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also ensure email column exists on family_members (used for Google Calendar invites)
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email TEXT;

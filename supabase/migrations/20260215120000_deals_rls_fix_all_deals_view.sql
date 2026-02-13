-- Fix: Allow all authenticated users to read ALL deals (for Deal History "All Deals" view).
-- Drops ALL existing policies on deals, then recreates the correct ones.
-- Run this if users still only see their own deals in "All Deals" mode.

-- 1. Drop every existing policy on public.deals (handles any policy names from prior migrations or dashboard)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deals')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.deals', r.policyname);
  END LOOP;
END $$;

-- 2. Create the correct policies: allow read-all for authenticated, restrict write to own deals
CREATE POLICY "Authenticated can read all deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

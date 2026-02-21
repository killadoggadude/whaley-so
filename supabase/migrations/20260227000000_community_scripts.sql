-- Enable community scripts feature
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Allow public read access to all scripts (users can view each other's scripts)
-- First, drop existing SELECT policy and recreate with broader access
DROP POLICY IF EXISTS "Users can view own scripts" ON public.scripts;

CREATE POLICY "Anyone can view scripts" 
  ON public.scripts FOR SELECT 
  USING (true);

-- 2. Keep insert/update/delete restricted to own scripts
DROP POLICY IF EXISTS "Users can insert own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can update own scripts" ON public.scripts;
DROP POLICY IF EXISTS "Users can delete own scripts" ON public.scripts;

CREATE POLICY "Users can insert own scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scripts"
  ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scripts"
  ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create index for leaderboard queries (last 7 days + upvotes)
CREATE INDEX IF NOT EXISTS idx_scripts_leaderboard 
  ON public.scripts(created_at DESC, upvotes_count DESC);

-- 4. Allow viewing user profiles for scripts (join)
-- This is needed to show user name/avatar on scripts
ALTER TABLE public.users ALTER COLUMN name SET DEFAULT NULL;
ALTER TABLE public.users ALTER COLUMN avatar_url SET DEFAULT NULL;

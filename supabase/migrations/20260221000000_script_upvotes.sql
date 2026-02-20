-- Add upvote feature to scripts
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add upvotes_count column to scripts
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS upvotes_count INTEGER DEFAULT 0;

-- 2. Create upvotes table
CREATE TABLE IF NOT EXISTS public.script_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, script_id)
);

CREATE INDEX IF NOT EXISTS idx_script_upvotes_script_id ON public.script_upvotes(script_id);
CREATE INDEX IF NOT EXISTS idx_script_upvotes_user_id ON public.script_upvotes(user_id);

-- 3. Enable RLS on script_upvotes
ALTER TABLE public.script_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view upvotes"
  ON public.script_upvotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upvotes"
  ON public.script_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
  ON public.script_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create RPC functions for increment/decrement
CREATE OR REPLACE FUNCTION increment_script_upvotes(script_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.scripts 
  SET upvotes_count = COALESCE(upvotes_count, 0) + 1 
  WHERE id = script_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_script_upvotes(script_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.scripts 
  SET upvotes_count = GREATEST(COALESCE(upvotes_count, 0) - 1, 0) 
  WHERE id = script_id;
END;
$$;

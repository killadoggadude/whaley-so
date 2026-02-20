-- Add archive feature to scripts
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add is_archived and archived_at columns
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_scripts_user_archived ON public.scripts(user_id, is_archived, created_at DESC);

-- 3. Allow updating is_archived (already covered by existing update policy)

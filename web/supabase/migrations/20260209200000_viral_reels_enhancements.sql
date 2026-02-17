-- Add view_count and approval_status columns to viral_reels
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE public.viral_reels
  ADD COLUMN view_count INTEGER DEFAULT 0,
  ADD COLUMN approval_status TEXT DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'denied'));

-- Add indexes for filtering by approval_status and view_count
CREATE INDEX idx_viral_reels_approval_status ON public.viral_reels(user_id, approval_status);
CREATE INDEX idx_viral_reels_view_count ON public.viral_reels(user_id, view_count DESC);

-- Add trigger to update updated_at on viral_reels
CREATE TRIGGER update_viral_reels_updated_at
  BEFORE UPDATE ON public.viral_reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

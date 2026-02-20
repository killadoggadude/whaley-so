-- Add curated reels support and gallery table
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Update viral_reels table for curated content
-- ============================================
ALTER TABLE public.viral_reels
ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'talking_head' CHECK (category IN ('talking_head', 'dancing', 'motion_control', 'general'));

CREATE INDEX IF NOT EXISTS idx_viral_reels_curated ON public.viral_reels(is_curated) WHERE is_curated = true;
CREATE INDEX IF NOT EXISTS idx_viral_reels_category ON public.viral_reels(category);

-- ============================================
-- Gallery table for community videos
-- ============================================
CREATE TABLE public.gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_type VARCHAR(20) NOT NULL CHECK (video_type IN ('talking_head', 'dancing', 'motion_control')),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  script_text TEXT,
  model_image_url TEXT,
  views INTEGER DEFAULT 0,
  remakes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gallery_user_id ON public.gallery(user_id);
CREATE INDEX idx_gallery_public ON public.gallery(is_public) WHERE is_public = true;
CREATE INDEX idx_gallery_video_type ON public.gallery(video_type);
CREATE INDEX idx_gallery_created ON public.gallery(created_at DESC);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public gallery items"
  ON public.gallery FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own gallery items"
  ON public.gallery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery items"
  ON public.gallery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery items"
  ON public.gallery FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

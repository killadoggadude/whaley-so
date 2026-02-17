-- Caption Presets: User-saved caption style presets
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Caption Presets table
-- ============================================
CREATE TABLE public.caption_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_caption_presets_user ON public.caption_presets(user_id);

ALTER TABLE public.caption_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own caption presets"
  ON public.caption_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own caption presets"
  ON public.caption_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own caption presets"
  ON public.caption_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own caption presets"
  ON public.caption_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_caption_presets_updated_at
  BEFORE UPDATE ON public.caption_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
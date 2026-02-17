-- AI Model Profiles: ai_models table + RLS policies
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- AI Models table
-- ============================================
CREATE TABLE public.ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  voice_id TEXT NOT NULL DEFAULT '',
  voice_settings JSONB NOT NULL DEFAULT '{"stability": 0.5, "similarity_boost": 0.75, "style": 0}',
  reference_image_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_models_user_id ON public.ai_models(user_id);
CREATE INDEX idx_ai_models_user_active ON public.ai_models(user_id, is_active) WHERE is_active = true;

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models"
  ON public.ai_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON public.ai_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON public.ai_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON public.ai_models FOR DELETE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

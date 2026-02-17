-- Prompts: generated image prompts from Claude Vision analysis
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Prompts table
-- ============================================
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  source_image_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  prompt_index INT NOT NULL DEFAULT 0,
  variation_label TEXT NOT NULL DEFAULT '',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prompts_user_id ON public.prompts(user_id);
CREATE INDEX idx_prompts_user_model ON public.prompts(user_id, model_id);
CREATE INDEX idx_prompts_user_created ON public.prompts(user_id, created_at DESC);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts"
  ON public.prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON public.prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON public.prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON public.prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

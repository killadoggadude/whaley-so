-- Scripts: saved video scripts for talking head
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Scripts table
-- ============================================
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  script_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
  source_script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  performance_score INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category constraint
ALTER TABLE public.scripts ADD CONSTRAINT script_category_check 
  CHECK (category IN ('flirty', 'confession', 'teaser', 'story', 'question', 'challenge', 'general'));

-- Indexes
CREATE INDEX idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX idx_scripts_user_category ON public.scripts(user_id, category);
CREATE INDEX idx_scripts_user_created ON public.scripts(user_id, created_at DESC);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scripts"
  ON public.scripts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scripts"
  ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scripts"
  ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

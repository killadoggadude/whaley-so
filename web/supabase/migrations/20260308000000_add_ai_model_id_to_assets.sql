-- Add ai_model_id column to assets table for grouping by AI Model
ALTER TABLE public.assets
  ADD COLUMN ai_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL;

-- Index for filtering assets by model within a user
CREATE INDEX idx_assets_user_model ON public.assets (user_id, ai_model_id);

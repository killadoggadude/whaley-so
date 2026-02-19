-- Generation Queue for job prioritization
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL
    CHECK (generation_type IN ('talking_head', 'tts', 'image_gen', 'transcript')),
  payload JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5
    CHECK (priority >= 1 AND priority <= 10),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_queue_status ON public.generation_queue(status);
CREATE INDEX idx_generation_queue_priority ON public.generation_queue(priority);
CREATE INDEX idx_generation_queue_user_id ON public.generation_queue(user_id);

ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items"
  ON public.generation_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON public.generation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON public.generation_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON public.generation_queue FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_generation_queue_updated_at
  BEFORE UPDATE ON public.generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
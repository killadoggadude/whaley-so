-- Asset Library: assets table + storage bucket + RLS policies
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Assets table
-- ============================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL
    CHECK (file_type IN ('image', 'audio', 'video', 'document')),
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_user_file_type ON public.assets(user_id, file_type);
CREATE INDEX idx_assets_user_favorite ON public.assets(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_assets_user_created ON public.assets(user_id, created_at DESC);
CREATE INDEX idx_assets_tags ON public.assets USING GIN(tags);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON public.assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON public.assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON public.assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON public.assets FOR DELETE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Supabase Storage bucket + RLS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
  ]
);

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload own assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

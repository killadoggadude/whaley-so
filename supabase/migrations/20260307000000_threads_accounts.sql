-- Threads Accounts: threads_accounts table + RLS policies
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- Threads Accounts table
-- ============================================
CREATE TABLE public.threads_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  threads_user_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  profile_pic_url TEXT DEFAULT '',
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, threads_user_id)
);

-- Indexes
CREATE INDEX idx_threads_accounts_user_id ON public.threads_accounts(user_id);
CREATE INDEX idx_threads_accounts_user_active ON public.threads_accounts(user_id, is_active) WHERE is_active = true;

ALTER TABLE public.threads_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own threads accounts"
  ON public.threads_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threads accounts"
  ON public.threads_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads accounts"
  ON public.threads_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads accounts"
  ON public.threads_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Reuse existing updated_at trigger
CREATE TRIGGER update_threads_accounts_updated_at
  BEFORE UPDATE ON public.threads_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

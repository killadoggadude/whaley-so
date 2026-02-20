-- Update subscription tiers and add user profile fields
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Update subscription_tier allowed values (PostgreSQL enum)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
        ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'agency';
    END IF;
END
$$;

-- Add subscription_status column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';

-- Add trial_end_date column  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- Add monthly_reel_limit column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS monthly_reel_limit INTEGER DEFAULT -1;

-- Add models_limit column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS models_limit INTEGER DEFAULT 1;

-- Add current_reels_used column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_reels_used INTEGER DEFAULT 0;

-- Add stripe_customer_id column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add stripe_subscription_id column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add avatar_url column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add username column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Add bio column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);

-- Update existing free users to have correct limits
UPDATE public.users 
SET 
    monthly_reel_limit = CASE 
        WHEN subscription_tier = 'starter' THEN 80
        WHEN subscription_tier = 'pro' THEN -1
        WHEN subscription_tier = 'agency' THEN -1
        ELSE -1
    END,
    models_limit = CASE 
        WHEN subscription_tier = 'starter' THEN 1
        WHEN subscription_tier = 'pro' THEN 3
        WHEN subscription_tier = 'agency' THEN -1
        ELSE 1
    END
WHERE subscription_tier IS NOT NULL;

# Supabase Database Schema

## Overview
All database tables, RLS policies, triggers, and conventions for the AI OFM project.

## Current Tables

### public.users
Extends Supabase `auth.users` with profile data.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | — | FK to auth.users, CASCADE delete |
| email | TEXT | — | From auth signup |
| name | TEXT | null | From signup metadata |
| subscription_tier | TEXT | 'free' | free/basic/pro/enterprise |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**RLS**: Users can SELECT, UPDATE, INSERT their own row only.

### public.user_api_keys
Stores encrypted API keys for third-party services.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| service | TEXT | — | elevenlabs/higgsfield/wavespeed |
| encrypted_api_key | TEXT | — | Encrypted at application layer |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**Constraint**: UNIQUE(user_id, service) — one key per service per user.
**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.

## Triggers

### handle_new_user()
- Fires AFTER INSERT on auth.users
- Creates a corresponding row in public.users
- Extracts name from raw_user_meta_data

### update_updated_at()
- Fires BEFORE UPDATE on public.users, public.user_api_keys, public.assets, public.ai_models, public.prompts, public.generations
- Sets updated_at = now()

## Conventions
- All tables use UUID primary keys
- All tables have created_at and updated_at timestamps
- RLS is enabled on every table
- Foreign keys use ON DELETE CASCADE
- Use pgcrypto for encryption functions

## Adding New Tables
1. Create migration file in `web/supabase/migrations/` with timestamp prefix
2. Enable RLS immediately
3. Add policies for user-scoped access
4. Add updated_at trigger
5. Update TypeScript types in `web/src/types/database.ts`
6. Run migration in Supabase Dashboard SQL Editor
7. Update this directive

### public.assets
Media files stored in Supabase Storage.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| filename | TEXT | — | Original filename |
| file_path | TEXT | — | Storage path: `{user_id}/{file_type}/{uuid}_{filename}` |
| file_type | TEXT | — | image/audio/video/document (CHECK) |
| mime_type | TEXT | — | e.g., image/jpeg |
| file_size | BIGINT | — | In bytes |
| tags | TEXT[] | '{}' | User-defined tags |
| is_favorite | BOOLEAN | false | Star/unstar |
| ai_model_id | UUID (FK) | null | FK to public.ai_models, SET NULL on delete. Groups asset by AI model. |
| metadata | JSONB | '{}' | Extensible metadata |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Storage**: Private bucket `assets`, 50MB limit, MIME whitelist, folder-based RLS.

### public.ai_models
AI model persona profiles with reference images and voice settings.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| name | TEXT | — | Model persona name |
| description | TEXT | '' | Optional description |
| voice_id | TEXT | '' | ElevenLabs voice ID |
| voice_settings | JSONB | `{"stability":0.5,"similarity_boost":0.75,"style":0}` | TtsSettings shape |
| reference_image_ids | UUID[] | '{}' | Soft refs to assets table |
| is_active | BOOLEAN | true | Active/inactive toggle |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Note**: reference_image_ids are soft references (no FK on array elements). App validates on write, gracefully handles stale IDs on read.

### public.prompts
Generated image prompts from Claude Vision analysis.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| model_id | UUID (FK) | null | FK to public.ai_models, SET NULL on delete |
| source_image_id | UUID (FK) | null | FK to public.assets, SET NULL on delete |
| prompt_text | TEXT | — | The generated/edited image prompt |
| prompt_index | INT | 0 | 0-4 for the 5 variations |
| variation_label | TEXT | '' | e.g., "Beach Sunset", "Urban Night" |
| is_edited | BOOLEAN | false | Has user modified the generated text? |
| metadata | JSONB | '{}' | Generation params |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Note**: model_id and source_image_id use ON DELETE SET NULL — prompts survive if the source model or image is deleted.

### public.generations
Image generation jobs submitted to Higgsfield API.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| prompt_id | UUID (FK) | null | FK to public.prompts, SET NULL on delete |
| prompt_text | TEXT | — | Denormalized prompt text (survives prompt deletion) |
| status | TEXT | 'pending' | pending/submitting/queued/in_progress/completed/failed/nsfw/cancelled (CHECK) |
| higgsfield_job_id | TEXT | null | Job/request ID from Higgsfield API |
| model | TEXT | 'soul' | Higgsfield model name |
| settings | JSONB | '{}' | Generation params (width_and_height, quality, enhance_prompt, etc.) |
| result_urls | TEXT[] | '{}' | Image URLs from Higgsfield CDN |
| saved_asset_ids | UUID[] | '{}' | Soft refs to assets saved from results |
| error_message | TEXT | null | Error details for failed/nsfw/cancelled |
| started_at | TIMESTAMPTZ | null | When generation was submitted |
| completed_at | TIMESTAMPTZ | null | When generation finished |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Indexes**: user_id, (user_id, status), (user_id, created_at DESC).
**Note**: prompt_id uses ON DELETE SET NULL. result_urls and saved_asset_ids are denormalized for simplicity. Frontend polls `/api/image-gen/status` every 3s for active jobs.

### public.threads_accounts
Connected Threads accounts with encrypted access tokens.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | uuid_generate_v4() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| threads_user_id | TEXT | — | Threads numeric user ID |
| username | TEXT | '' | @handle |
| profile_pic_url | TEXT | '' | Profile picture URL |
| access_token | TEXT | — | AES-256-GCM encrypted (same as API keys) |
| token_expires_at | TIMESTAMPTZ | — | Long-lived token = 60 days |
| is_active | BOOLEAN | true | Active/inactive toggle |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**Constraint**: UNIQUE(user_id, threads_user_id) — one entry per Threads account per user.
**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Token lifecycle**: Short-lived (1hr) → Long-lived (60 days) → Refresh before expiry.

### public.viral_reels
Saved viral reels for content inspiration.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID (PK) | gen_random_uuid() | — |
| user_id | UUID (FK) | — | FK to public.users, CASCADE |
| url | TEXT | — | Full Instagram reel URL |
| platform | TEXT | 'instagram' | instagram/tiktok/youtube |
| shortcode | TEXT | null | Extracted from URL for dedup |
| thumbnail_url | TEXT | null | Path to stored thumbnail in Supabase Storage |
| notes | TEXT | '' | User's notes about the reel |
| tags | TEXT[] | '{}' | User tags (e.g. "talking_head", "dancing") |
| is_favorite | BOOLEAN | false | — |
| view_count | INTEGER | 0 | Fetched from Instagram/TikTok/YouTube API |
| approval_status | TEXT | 'pending' | pending/approved/denied (CHECK constraint) |
| created_at | TIMESTAMPTZ | now() | — |
| updated_at | TIMESTAMPTZ | now() | Auto-updated via trigger |

**Constraint**: UNIQUE(user_id, shortcode) — one entry per reel per user.
**Indexes**: 
  - (user_id, created_at DESC) for fast listing
  - (user_id, approval_status) for filtering by status
  - (user_id, view_count DESC) for sorting by popularity
**RLS**: Users can SELECT, INSERT, UPDATE, DELETE their own rows only.
**Approval**: Reels with ≥100k views auto-approved on creation, <100k auto-denied.

## Future Tables (from spec)
- instagram_accounts — Connected IG accounts (Phase 3+)
- scheduled_posts — Scheduled posts (Phase 3 Week 10)
- comment_templates — Comment templates (Phase 3 Week 11)
- auto_comments — Auto-comment queue (Phase 3 Week 11)
- caption_templates — Caption templates (Phase 3 Week 12)
- caption_examples — Caption style examples (Phase 3 Week 12)
- post_analytics — Performance metrics (Phase 4)
- cost_tracking — API cost tracking (Phase 4)
- content_insights — Performance patterns (Phase 4)

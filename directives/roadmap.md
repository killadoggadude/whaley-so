# Product Roadmap

## Phase 1: Foundation (Weeks 1-4) — COMPLETE

### Week 1: Project Setup & Auth — COMPLETE
- Next.js 16 scaffold, Supabase Auth, DB schema, middleware

### Week 2: API Key Management & Tools — COMPLETE
- API key encryption, ElevenLabs TTS, Wavespeed transcription

### Week 3: Asset Library — COMPLETE
- Upload, grid/list view, filters, tags, favorites, detail dialog

### Week 4: AI Model Configuration — COMPLETE
- Model profiles, reference images from asset library, voice settings

## Phase 2: Content Production (Weeks 5-8) — COMPLETE

### Week 5: Image Prompt Generator — COMPLETE
- Upload inspiration image → AI analyzes in structured detail → single recreation prompt
- Multi-provider: Google Gemini (recommended), OpenAI (GPT-4o), Claude (Anthropic)
- Save/edit/copy/delete prompts

### Week 6: Image Generation Integration — COMPLETE
- [x] WaveSpeed AI image generation (Nano Banana Pro + MiniMax Image-01 + Instagirl models)
- [x] AI model character selection with reference images for character-consistent generation
- [x] Nano Banana Pro `/edit` endpoint with `images[]` for character reference from AI model profiles
- [x] MiniMax Image-01 `subject_reference` for character reference from AI model profiles
- [x] Batch image generation (select up to 5 saved prompts, sequential processing)
- [x] Synchronous generation (WaveSpeed sync mode — returns CDN URLs immediately)
- [x] Auto-save generated images to asset library (download CDN → Supabase Storage → assets DB)
- [x] Generation history UI (status badges, result thumbnails, model/character info)
- [x] Generation tracking via `generations` DB table (status, settings, result_urls, saved_asset_ids)

### Week 7-8: Talking Head Pipeline — COMPLETE
- [x] 7-step single-page wizard at `/dashboard/tools/talking-head`
- [x] Video URL input + WaveSpeed Whisper transcription (reuses existing `/api/transcribe`)
- [x] Transcript review + script editing UI
- [x] Voice generation via ElevenLabs TTS (reuses existing `/api/tts/generate`) with AI model selection
- [x] Audio upload to Supabase Storage for InfiniteTalk (new `/api/talking-head/upload-audio`)
- [x] Portrait image selector from asset library (single-select, model reference images pre-filtered)
- [x] WaveSpeed InfiniteTalk API integration (async: submit → client-side polling → completion)
- [x] Lip-sync video generation with resolution selection (480p / 720p)
- [x] Video preview player (HTML5 `<video>`)
- [x] Download video functionality
- [x] Save video to asset library (download CDN → Supabase Storage → asset record)

## Phase 3: Social Media Integration (Weeks 9-12)

### Week 9: Threads Account Connection — COMPLETE
- [x] Meta app setup directive (`directives/threads-setup.md`)
- [x] `threads_accounts` DB migration with RLS, indexes, updated_at trigger
- [x] `ThreadsAccount` + `ThreadsAccountWithStatus` types in `database.ts`
- [x] `lib/threads.ts` — OAuth helpers (auth URL, token exchange, long-lived, refresh, profile)
- [x] Token encryption reuses existing AES-256-GCM (`lib/crypto.ts`)
- [x] Token status detection (valid / expiring_soon / expired)
- [x] OAuth API routes: `/api/threads/authorize`, `/api/threads/callback`, `/api/threads/disconnect`
- [x] CSRF protection via `state` parameter in httpOnly cookie
- [x] Server actions: getThreadsAccounts, refreshToken, disconnect, toggleActive
- [x] `ThreadsConnectionCard` UI in settings page — connect, refresh, toggle, disconnect with confirmation dialog
- [x] Multi-account support (UNIQUE on user_id + threads_user_id)
- [x] Environment variables: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`

### Week 10: Post Composer & Scheduler
- [ ] `scheduled_posts` DB migration with retry logic
- [ ] pg_cron setup migration (every-minute Edge Function invocation)
- [ ] Threads publishing helpers (`createContainer`, `publishContainer`, `checkStatus`, `publishPost`)
- [ ] Supabase Edge Function `publish-scheduled-posts` (Deno, service role key)
- [ ] Deno-compatible AES-256-GCM decrypt (`_shared/crypto.ts`)
- [ ] Scheduler page at `/dashboard/scheduler`
- [ ] Post composer (content, account selector, media type, media picker, date/time picker)
- [ ] Post list (filterable by status, edit/delete/publish now actions)
- [ ] Calendar view (monthly grid, post dots, color-coded status)
- [ ] Media picker dialog (asset library, filter by type)
- [ ] "Publish Now" API route
- [ ] Sidebar nav entry: "Scheduler" with Calendar icon

### Week 11: Auto-Comment System
- [ ] `comment_templates` + `auto_comments` DB migration
- [ ] Comment variation API route (Claude AI rewrites by tone)
- [ ] Auto-comment configuration in post composer (toggle, templates, delay settings)
- [ ] Comment templates manager (CRUD, tone selector, variation preview)
- [ ] Edge Function extended for auto-comment publishing via Threads replies API
- [ ] Threads reply helpers (`createReply`, `publishReply`)

### Week 12: Caption AI
  - [ ] `caption_templates` + `caption_examples` DB migration
  - [ ] Caption generation API route (multi-provider: Claude/Gemini/OpenAI)
  - [ ] Caption generator UI (context, tone, template, provider selection)
  - [ ] Caption examples manager (CRUD, bulk import)
  - [ ] Integration with post composer (AI Caption button → auto-fill)

## Phase 4: Cost Estimator & Queue System — COMPLETE

### Week 13-14: Generation Features (Moved from Queue Plan)
- [x] Generation cost estimator (before running)
  - [x] Cost calculation for TTS (Step 4: Voice) - $0.00022 per character
  - [x] Cost calculation for video generation (Step 6: Generate) - $0.03/sec (480p) / $0.06/sec (720p)
  - [x] Minimum charge: $0.15, 最大 duration: 10 minutes
  - [x] Display: duration (e.g., "0:45"), total cost prominently, minimum charge warning
  - [x] Update Generate button text: "Generate Video — Est. $1.35"
- [x] Queue prioritization
  - [x] `generation_queue` table migration with priority (1-10), status, retry_count, max_retries, error_message
  - [x] Priority tiers: Enterprise (1), Pro (2), Basic (3), Free (4)
  - [x] `/api/queue/process` - Cron-triggered job processor
  - [x] `/api/talking-head/queue` - Queue submission (replaces direct API call)
  - [x] `/api/talking-head/queue-status` - Status polling for queued jobs
  - [x] Updated StepVideoGen to use queue system (2-stage polling: queue → WaveSpeed)
- [x] Error handling & retry logic
  - [x] Retryable errors classification (network, rate limit, 503, 502)
  - [x] Non-retryable errors (400, 401, 403, 404)
  - [x] Exponential backoff: 1s, 2s, 4s, 8s, 16s
  - [x] Max 3 retries, then failed state
  - [x] Error message logging in database
  - [x] Documentation: `directives/queue-setup.md`

## Phase 5: Future Enhancements — PLANNED
- [ ] Multi-concurrent job processing
- [ ] Queue status dashboard
- [ ] User credit/usage tracking and limits
- [ ] Webhook-based job completion notifications
- [ ] Bulk queue submission for image generation
- [ ] TTS queue integration (currently async only)
- [ ] Email notifications for failed jobs

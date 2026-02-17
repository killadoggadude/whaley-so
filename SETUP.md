# AI OFM - Setup & Deployment Guide

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Cloudflare R2 account (for storage)
- External API keys:
  - ElevenLabs (for TTS)
  - WaveSpeed (for video generation)
  - Optionally: Google Gemini, OpenAI GPT-4o, Anthropic Claude (for prompt generation)

### Local Development Setup

1. **Clone and install dependencies:**
```bash
cd web
npm install
```

2. **Set up Supabase:**

   In Supabase Dashboard > SQL Editor, run the migrations in order:
   - `20260207000000_initial_schema.sql`
   - `20260214000000_assets_table.sql`
   - `20260221000000_ai_models_table.sql`
   - `20260228000000_prompts_table.sql`
   - `20260307000000_threads_accounts.sql`
   - `20260308000000_add_ai_model_id_to_assets.sql`
   - `20260209000000_generation_queue.sql` *(new, for cost estimator & queue system)*

3. **Configure environment variables:**

   Copy `.env.example` to `.env` and fill in:
   ```
   # Optional: AI provider keys
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key

   # Required for queue system
   CRON_SECRET=generate-secure-random-string-here
   ```

4. **Start development server:**
```bash
npm run dev
```

Visit http://localhost:3000

## Features Implemented

### Phase 1: Foundation ✅
- User authentication (Supabase Auth)
- API key management with encryption (AES-256-GCM)
- Asset library (images, audio, video, documents)
- AI model configuration with reference images

### Phase 2: Content Production ✅
- **Image prompt generator** - Analyze inspiration images to generate prompts
- **Image generation** - WaveSpeed AI integration:
  - Nano Banana Pro (character reference support)
  - MiniMax Image-01
  - Instagirl model
- **Talking head videos** - 7-step wizard:
  1. Video URL → Transcript
  2. Transcript review
  3. Script editing
  4. Voice generation (ElevenLabs TTS)
  5. Portrait image selection
  6. Video generation with **cost estimation**
  7. Preview & save
- **Viral reels library** - Save Instagram/TikTok content for inspiration

### Phase 3: Social Media Integration 🚧
- **Threads connection** - Meta OAuth integration (complete)
- Post composer & scheduler (planned)
- Auto-comment system (planned)

### Cost Estimator (Phase 4) ✅
**Implemented across two steps:**

1. **Voice Generation (Step 4):**
   - Real-time TTS cost calculation based on character count
   - Pricing: ~$0.00022 per character
   - Shown before generating audio

2. **Video Generation (Step 6):**
   - Cost based on audio duration × resolution
   - Pricing: $0.03/sec (480p) or $0.06/sec (720p)
   - Minimum charge: $0.15
   - Maximum duration: 10 minutes
   - Shows formatted duration (e.g., "0:45")

### Queue Prioritization (Phase 5) ✅
**Features:**
- Priority-based job queue (1 = highest, 10 = lowest)
- Subscription-tier priorities: Enterprise (1), Pro (2), Basic (3), Free (4)
- Persistent job tracking (survives page refresh)
- Retry logic with exponential backoff (max 3 retries)
- Retryable vs non-retryable error classification

**API Routes:**
- `POST /api/talking-head/queue` - Submit job to queue
- `GET /api/talking-head/queue-status` - Check job status
- `POST /api/queue/process` - Process queued jobs (cron-triggered)

**Setup required:**
1. Run `20260209000000_generation_queue.sql` migration
2. Set `CRON_SECRET` in `.env`
3. Set up cron job to call `/api/queue/process` every 1-2 minutes

## Database Schema

### Key Tables

**users** - User profiles
**user_api_keys** - Encrypted third-party API keys
**assets** - Media file library
**ai_models** - AI character/persona profiles
**prompts** - Generated image prompts
**threads_accounts** - Connected Threads accounts
**viral_reels** - Saved viral content
**generation_queue** - Job prioritization and retry tracking

## Deployment

### Vercel Deployment

1. **Connect your GitHub repo** to Vercel
2. **Set environment variables** in Vercel Dashboard:
   - `CRON_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.
3. **Configure cron jobs** (for queue processor):
   - Add to `vercel.json`:
   ```json
   {
     "crons": [{
       "path": "/api/queue/process",
       "schedule": "*/2 * * * *"
     }]
   }
   ```
4. **Deploy** - Vercel will handle auto-deploys on push

### Cron Job Options

**Option 1: Vercel Cron** (Recommended)
```json
{ "path": "/api/queue/process", "schedule": "*/2 * * * *" }
```

**Option 2: GitHub Actions**
Use `.github/workflows/queue-processor.yml` (see directives/queue-setup.md)

**Option 3: External Cron Service**
Send POST request with header: `x-cron-secret: YOUR_SECRET`

## API Documentation

Cost Estimator Utility:
- `getAudioDuration(url)` - Get audio duration in seconds
- `calculateVideoCost(duration, resolution)` - Calculate video cost
- `calculateTTSCost(text)` - Calculate TTS cost
- `formatDuration(seconds)` - Format seconds as "M:S"

Queue System:
- See `directives/queue-setup.md` for detailed documentation

## Roadmap Status

✅ **Phase 1** (Foundation) - Weeks 1-4
✅ **Phase 2** (Content Production) - Weeks 5-8
🚧 **Phase 4** (Cost Estimator & Queue) - Just complete
📋 **Phase 3** (Social Media) - Week 9 done, Weeks 10-12 pending

## Troubleshooting

**Type errors:**
```bash
cd web && npx tsc --noEmit --skipLibCheck
```

**Database migrations not applying:**
- Check Supabase logs
- Verify SQL syntax in migration files
- Run migrations in order by filename date prefix

**Queue jobs stuck:**
```sql
-- Reset stuck jobs
UPDATE generation_queue
SET status = 'pending', started_at = NULL
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';
```

## Support

For issues or questions, create a ticket with:
- Error messages
- Steps to reproduce
- Environment details (local/production)
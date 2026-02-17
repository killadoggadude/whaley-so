# AI OFM - Queue System Documentation

## Overview

The queue system manages generation jobs with prioritization and automatic retry logic. It's designed to handle video generation, TTS, and other long-running tasks efficiently.

## How It Works

### Architecture

```
User Request
    ↓
Submit to Queue (/api/talking-head/queue)
    ↓
Stored in generation_queue table
    ↓
Cron Job calls /api/queue/process
    ↓
Jobs sorted by priority (tier-based)
    ↓
Job processed (calls external APIs)
    ↓
Result saved, status updated
    ↓
Polling route returns result to front-end
```

### Priority System

Jobs are prioritized based on subscription tier:

| Tier | Priority | Description |
|------|----------|-------------|
| Enterprise | 1 | Highest priority |
| Pro | 2 | Very high priority |
| Basic | 3 | High priority |
| Free | 4 | Standard priority |

Priority also affects queue ordering within the same tier: older jobs get processed first.

### Retry Logic

**Retryable errors:**
- Network issues: ECONNRESET, ETIMEDOUT, ECONNREFUSED
- Rate limits: 429
- Server errors: 502, 503

**Non-retryable errors:**
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

**Exponential backoff:**
- Retry 1: 1 second delay
- Retry 2: 2 seconds delay
- Retry 3: 4 seconds delay
- Retry 4: 8 seconds delay
- Retry 5: 16 seconds delay

Max 3 retries by default.

### Job States

1. **pending** - Waiting to be processed
2. **processing** - Currently being worked on
3. **retrying** - Failed, waiting for backoff before retry
4. **completed** - Successfully finished
5. **failed** - Permanently failed (exhausted retries)

## Setup

### 1. Database Migration

Run the SQL in `web/supabase/migrations/20260209000000_generation_queue.sql` in Supabase Dashboard.

### 2. Environment Variables

Add to `.env`:

```
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Cron Job Setup

**Option A: Vercel Cron Jobs (Recommended)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/queue/process",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Option B: GitHub Actions**

Create `.github/workflows/queue-processor.yml`:
```yaml
name: Queue Processor
on:
  schedule:
    - cron: '*/2 * * * *'
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call queue processor
        run: |
          curl -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            https://your-app.vercel.app/api/queue/process
```

**Option C: External Cron Service**

Use services like cron-job.org, EasyCron, etc. to call:
```
POST https://your-app.vercel.app/api/queue/process
Header: x-cron-secret: YOUR_SECRET
```

### 4. Configuration

Adjust polling interval in `web/src/components/talking-head/step-video-gen.tsx`:

```typescript
const POLL_INTERVAL_MS = 3000; // Check every 3 seconds
const MAX_POLL_ATTEMPTS = 100; // Max 5 minutes total
```

## API Routes

### POST /api/talking-head/queue

Submit a talking head job to the queue.

**Request:**
```json
{
  "audioSignedUrl": "https://...",
  "imageSignedUrl": "https://...",
  "resolution": "480p"
}
```

**Response:**
```json
{
  "queueItem": {
    "id": "uuid",
    "status": "pending",
    "generation_type": "talking_head",
    "priority": 2,
    ...
  }
}
```

### GET /api/talking-head/queue-status?queueId={id}

Check the status of a queued job.

**Response:**
```json
{
  "status": "completed",
  "taskId": "wavespeed-task-id",
  "retry_count": 0,
  "max_retries": 3
}
```

### POST /api/queue/process

Process pending jobs (called by cron).

**Headers:**
- `x-cron-secret` - Must match `CRON_SECRET` env var

## Cost Estimation

The queue system integrates with the cost estimator:

**Voice Step (Step 4):**
- Calculates TTS cost based on character count ($0.00022/char)

**Generate Step (Step 6):**
- Calculates video cost based on duration × resolution
- Pricing: $0.03/sec for 480p, $0.06/sec for 720p
- Minimum charge: $0.15
- Max duration: 10 minutes

## Adding New Job Types

1. Add job type to `web/src/types/database.ts`:
```typescript
export type GenerationType = "talking_head" | "tts" | "image_gen" | "transcript" | "your_type";
```

2. Add handler to `web/src/app/api/queue/process/route.ts`:
```typescript
case "your_type":
  result = await processYourJob(job.payload);
  break;
```

3. Create submission endpoint:
```typescript
// /api/your-job/queue
```

## Monitoring

Check queue status in Supabase Dashboard:

```sql
-- Pending jobs count
SELECT status, COUNT(*) FROM generation_queue GROUP BY status;

-- Jobs per user
SELECT user_id, COUNT(*) FROM generation_queue GROUP BY user_id;

-- Failed jobs with errors
SELECT id, error_message, retry_count, max_retries
FROM generation_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## Troubleshooting

**Jobs stuck in 'processing' state:**
```sql
-- Reset stuck jobs (manual intervention)
UPDATE generation_queue
SET status = 'pending', started_at = NULL
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';
```

**High queue backlog:**
- Increase cron frequency (e.g., every 1 minute instead of 2)
- Add multiple concurrent processors
- Scale up external API limits

**Retries not working:**
- Check error messages in generation_queue table
- Verify error classification logic in queue processor
- Check API key configuration for failed services
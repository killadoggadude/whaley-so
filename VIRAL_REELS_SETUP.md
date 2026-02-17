# Viral Reels Enhancement - Setup Guide

This guide walks you through setting up the new Viral Reels features: view count tracking, auto-approval, auto-tagging, and enhanced filtering.

---

## Overview of New Features

### 1. View Count Tracking
- Fetches view counts from Instagram (TikTok/YouTube supported but require additional setup)
- Displays formatted view count badges on reel cards (e.g., "123K views")

### 2. Auto-Approval System
- Reels with **≥100,000 views** automatically marked as "approved"
- Reels with **<100,000 views** automatically marked as "denied"
- Default library view shows only approved reels (user can filter to see all)

### 3. Auto-Tagging
- Automatically detects content type: "talking_head" or "dancing"
- Uses API-based heuristics (keyword detection in titles/captions)
- Tags added to reel on creation (can be edited manually)

### 4. Enhanced Filtering
- **Approval Status**: Filter by approved/denied/pending
- **View Count Range**: Set min/max view count filters
- **Tags**: Filter by multiple tags (dropdown with checkboxes)
- **Sort by Views**: Sort reels by view count (high to low, or vice versa)

---

## Step 1: Run Database Migration

### 1.1 Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `lyyfgoaxjqszgjrehigh`
3. Navigate to **SQL Editor** in the left sidebar

### 1.2 Run Migration SQL

Copy and paste the following SQL into the editor and click **Run**:

```sql
-- Add view_count and approval_status columns to viral_reels
ALTER TABLE public.viral_reels
  ADD COLUMN view_count INTEGER DEFAULT 0,
  ADD COLUMN approval_status TEXT DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'denied'));

-- Add indexes for filtering by approval_status and view_count
CREATE INDEX idx_viral_reels_approval_status ON public.viral_reels(user_id, approval_status);
CREATE INDEX idx_viral_reels_view_count ON public.viral_reels(user_id, view_count DESC);

-- Add trigger to update updated_at on viral_reels
CREATE TRIGGER update_viral_reels_updated_at
  BEFORE UPDATE ON public.viral_reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
```

### 1.3 Verify Migration

Run this query to verify the new columns exist:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'viral_reels'
  AND column_name IN ('view_count', 'approval_status');
```

Expected output:
```
column_name       | data_type | column_default
------------------+-----------+----------------
view_count        | integer   | 0
approval_status   | text      | 'pending'::text
```

---

## Step 2: Set Up Instagram API Credentials

To fetch view counts from Instagram, you need to register an app with Meta/Facebook.

### 2.1 Create Instagram App

1. Go to https://developers.facebook.com/apps
2. Click **Create App**
3. Select **Business** as the app type
4. Fill in app details:
   - **App Name**: AI OFM (or your project name)
   - **Contact Email**: Your email
   - **Business Account**: Select or create one

### 2.2 Add Instagram Basic Display Product

1. In your app dashboard, scroll to **Add Products**
2. Find **Instagram Basic Display** and click **Set Up**
3. Click **Create New App** under Instagram Basic Display
4. Fill in:
   - **Display Name**: AI OFM
   - **Privacy Policy URL**: Your privacy policy URL (or use a placeholder)
   - **Terms of Service URL**: Your terms URL (or use a placeholder)

### 2.3 Configure OAuth Redirect URIs

1. In Instagram Basic Display settings, scroll to **OAuth Redirect URIs**
2. Add the following URIs:
   - Development: `http://localhost:3000/api/instagram/callback`
   - Production: `https://yourdomain.com/api/instagram/callback` (when deployed)
3. Click **Save Changes**

### 2.4 Get App Credentials

1. In your app dashboard, go to **Settings > Basic**
2. Copy the following values:
   - **App ID**
   - **App Secret** (click **Show** to reveal)

### 2.5 Generate Access Token

#### Option A: Manual Authorization (Quick Start)

1. Open this URL in your browser (replace `{APP_ID}` with your App ID):

```
https://api.instagram.com/oauth/authorize?client_id={APP_ID}&redirect_uri=http://localhost:3000/api/instagram/callback&scope=user_profile,user_media&response_type=code
```

2. Log in with your Instagram account
3. Authorize the app
4. You'll be redirected to `http://localhost:3000/api/instagram/callback?code=...`
5. Copy the `code` parameter from the URL
6. The callback will exchange it for a long-lived token and display it

#### Option B: Use Instagram Graph API Tester (Alternative)

1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app from the dropdown
3. Generate a User Access Token with `instagram_basic` permissions
4. Use the Token Debugger to extend it to a long-lived token (60 days)

### 2.6 Add Credentials to .env

Open `web/.env.local` and update the Instagram section:

```bash
# Instagram API (for Viral Reels view count)
INSTAGRAM_APP_ID=your-actual-app-id
INSTAGRAM_APP_SECRET=your-actual-app-secret
INSTAGRAM_ACCESS_TOKEN=your-long-lived-access-token
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
```

**Important**: 
- Long-lived Instagram tokens expire after **60 days**
- You'll need to refresh the token before expiry (see Step 5 for automation)

---

## Step 3: (Optional) Set Up YouTube API

If you want to fetch view counts for YouTube videos:

### 3.1 Enable YouTube Data API

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable **YouTube Data API v3**
4. Create an API key under **Credentials**

### 3.2 Add to .env

```bash
# YouTube API (optional - for YouTube view counts)
YOUTUBE_API_KEY=your-youtube-api-key
```

---

## Step 4: Test the Implementation

### 4.1 Restart Development Server

```bash
cd web
npm run dev
```

### 4.2 Test Adding a New Reel

1. Navigate to `/dashboard/viral-reels`
2. Add a new Instagram reel URL (use a reel with known high view count, e.g., 500K+)
3. Wait a few seconds for processing
4. Verify:
   - ✅ View count badge appears on the card
   - ✅ Approval status badge (green checkmark) if ≥100K views
   - ✅ Content type tag added ("talking_head" or "dancing")
   - ✅ Thumbnail loads correctly

### 4.3 Test Filtering

1. **Approval Status Filter**:
   - Set dropdown to "All Status" → see all reels
   - Set to "Approved" → see only ≥100K view reels
   - Set to "Denied" → see only <100K view reels

2. **View Count Range**:
   - Enter "100000" in Min views → only show reels with ≥100K
   - Enter "1000000" in Max views → only show reels with ≤1M

3. **Tags Filter**:
   - Click Tags dropdown
   - Check "talking_head" → filter by tag
   - Check multiple tags → show reels with any selected tag

4. **Sort by Views**:
   - Select "Most Views" from sort dropdown
   - Verify reels are sorted by view count (descending)

### 4.4 Verify Database Updates

In Supabase SQL Editor, run:

```sql
SELECT url, view_count, approval_status, tags
FROM public.viral_reels
ORDER BY created_at DESC
LIMIT 5;
```

Expected output shows reels with:
- `view_count` populated (e.g., 523000)
- `approval_status` set correctly (approved if ≥100K, denied if <100K)
- `tags` includes content type ("talking_head" or "dancing")

---

## Step 5: Set Up Token Refresh (Production)

Instagram access tokens expire after 60 days. Set up automatic refresh:

### 5.1 Create Refresh Cron Job

Add to your existing `dev-cron.js` or create a new scheduled task:

```javascript
import { refreshInstagramAccessToken } from "./web/src/lib/instagram-auth.js";

// Run every 30 days (before 60-day expiry)
async function refreshInstagramToken() {
  console.log("[CRON] Refreshing Instagram access token...");
  const newToken = await refreshInstagramAccessToken();
  
  if (newToken) {
    console.log("[CRON] ✓ Instagram token refreshed successfully");
    // TODO: Store new token in database or update .env
  } else {
    console.error("[CRON] ✗ Failed to refresh Instagram token");
  }
}

// Schedule: Every 30 days (2,592,000,000 ms)
setInterval(refreshInstagramToken, 2_592_000_000);
```

### 5.2 Monitor Token Expiry

Set up alerts to notify you if token refresh fails. You can check token validity:

```bash
curl -X GET "https://graph.instagram.com/me?fields=id,username&access_token=YOUR_TOKEN"
```

If you get an error about expired token, manually refresh using the OAuth flow (Step 2.5).

---

## Step 6: Update Existing Reels (Optional)

If you have existing reels without view counts, you can backfill them:

### 6.1 Create Backfill Script

Create `web/scripts/backfill-view-counts.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { fetchViewCount } from "../src/lib/view-count";
import { getInstagramAccessToken } from "../src/lib/instagram-auth";
import { detectContentType } from "../src/lib/content-type";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfillViewCounts() {
  const { data: reels } = await supabase
    .from("viral_reels")
    .select("*")
    .eq("view_count", 0);

  const accessToken = getInstagramAccessToken();

  for (const reel of reels || []) {
    const viewCount = await fetchViewCount(reel.url, reel.platform, accessToken);
    const approvalStatus = viewCount >= 100000 ? "approved" : "denied";
    const contentType = await detectContentType(reel.url, reel.platform);
    const tags = contentType ? [contentType, ...reel.tags] : reel.tags;

    await supabase
      .from("viral_reels")
      .update({ view_count: viewCount, approval_status: approvalStatus, tags })
      .eq("id", reel.id);

    console.log(`Updated reel ${reel.id}: ${viewCount} views (${approvalStatus})`);
  }
}

backfillViewCounts();
```

### 6.2 Run Backfill

```bash
cd web
npx tsx scripts/backfill-view-counts.ts
```

---

## Troubleshooting

### Issue: View counts are always 0

**Cause**: Instagram API credentials not configured or token expired

**Solution**:
1. Verify `.env.local` has correct `INSTAGRAM_ACCESS_TOKEN`
2. Test token validity:
   ```bash
   curl "https://graph.instagram.com/me?access_token=YOUR_TOKEN"
   ```
3. If expired, regenerate using OAuth flow (Step 2.5)

### Issue: "Failed to fetch view count" errors in console

**Cause**: Instagram API rate limiting or invalid reel URL

**Solution**:
1. Check if reel URL is valid (open in browser)
2. Wait a few minutes and try again (rate limit: 200 requests/hour)
3. For business accounts, use Instagram Graph API instead of Basic Display

### Issue: Content type detection always returns "talking_head"

**Cause**: Instagram oEmbed doesn't expose detailed metadata

**Solution**:
- This is expected behavior (keyword-based heuristic)
- Manually edit tags if incorrect
- For better accuracy, implement computer vision (future enhancement)

### Issue: Reels not appearing in library

**Cause**: Default filter shows only "approved" reels

**Solution**:
1. Change Approval Status dropdown to "All Status"
2. Check if reel has <100K views (auto-denied)
3. Manually change `approval_status` in database if needed

### Issue: Thumbnails not loading

**Cause**: Separate from view count feature (already fixed)

**Solution**: See previous session's thumbnail fix (Instagram og:image scraping)

---

## API Rate Limits

### Instagram Basic Display API
- **Rate Limit**: 200 requests per hour per user
- **Token Validity**: 60 days (long-lived)
- **Workaround**: Batch fetch view counts, cache results

### YouTube Data API v3
- **Rate Limit**: 10,000 quota units per day (1 video stats = 1 unit)
- **Token Validity**: No expiry (API key)

### Recommendations
- Cache view counts in database (don't refetch every page load)
- Implement refresh button for manual updates
- Consider background job to update view counts daily

---

## Next Steps (Future Enhancements)

1. **Manual Approval Queue**: Allow admin to override auto-approval decisions
2. **View Count Refresh**: Add "Refresh" button to update view counts for existing reels
3. **Better Content Detection**: Use computer vision (MediaPipe) for accurate talking head vs dancing detection
4. **TikTok Support**: Integrate TikTok for Developers API for view counts
5. **Analytics Dashboard**: Track which content types perform best
6. **Batch Import**: Upload CSV of reel URLs for bulk processing

---

## Files Changed

### Created
- `web/supabase/migrations/20260209200000_viral_reels_enhancements.sql`
- `web/src/lib/instagram-auth.ts`
- `web/src/lib/view-count.ts`
- `web/src/lib/content-type.ts`
- `web/src/components/viral-reels/tags-filter.tsx`
- `web/src/app/api/instagram/callback/route.ts`

### Modified
- `web/src/types/database.ts` (ViralReel, ViralReelFilters interfaces)
- `web/src/app/dashboard/viral-reels/actions.ts` (addViralReelAction, getViralReelsAction)
- `web/src/components/viral-reels/reel-filters.tsx` (added filter controls)
- `web/src/components/viral-reels/viral-reels-library.tsx` (filter state management)
- `web/src/components/viral-reels/reel-card.tsx` (view count & approval badges)
- `web/.env.local` (Instagram/YouTube API credentials)
- `directives/supabase-schema.md` (updated viral_reels table docs)

---

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify database migration ran successfully
3. Test Instagram token validity
4. Review Supabase logs for RLS policy issues

For Instagram API issues:
- Documentation: https://developers.facebook.com/docs/instagram-basic-display-api
- Status: https://developers.facebook.com/status/

---

**Setup Complete!** 🎉

Your Viral Reels feature now tracks view counts, auto-approves high-performing content, auto-tags content types, and provides powerful filtering capabilities.

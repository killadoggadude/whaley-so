# Threads API Setup Guide

## Prerequisites
- A Threads account (personal or business)
- A Meta developer account at [developers.facebook.com](https://developers.facebook.com)

## Step 1: Create Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Other** as the use case
4. Select **Consumer** as the app type
5. Enter app name (e.g., "AI OFM Tool") and contact email
6. Click **Create App**

## Step 2: Add Threads API Product

1. In the app dashboard, scroll to **Add Products**
2. Find **Threads API** and click **Set Up**
3. The Threads API product is now added to your app

## Step 3: Configure OAuth Settings

1. Go to **Threads API** → **Settings** in the left sidebar
2. Under **Redirect Callback URLs**, add:
   - Development: `http://localhost:3000/api/threads/callback`
   - Production: `https://your-domain.com/api/threads/callback`
3. Under **Deauthorize Callback URL**, add:
   - `http://localhost:3000/api/threads/deauthorize` (optional)
4. Click **Save Changes**

## Step 4: Configure Permissions

The app needs these scopes (configured in the OAuth URL):
- `threads_basic` — Read user profile info
- `threads_content_publish` — Create and publish posts
- `threads_read_replies` — Read replies to posts
- `threads_manage_replies` — Reply to posts

## Step 5: Add Test Users (Development Mode)

While the app is in **Development Mode**, only added test users can authorize:

1. Go to **App Roles** → **Roles**
2. Click **Add People**
3. Add the Threads account(s) you want to test with
4. The invited user must accept the invitation from their Meta developer account

**Important:** In development mode, posts created via the API are only visible to test users. Switch to **Live Mode** for public visibility.

## Step 6: Get App Credentials

1. Go to **App Settings** → **Basic**
2. Copy the **App ID** and **App Secret**
3. Add them to your `.env.local`:

```env
META_APP_ID=your-app-id-here
META_APP_SECRET=your-app-secret-here
META_REDIRECT_URI=http://localhost:3000/api/threads/callback
```

## Step 7: Set Supabase Service Role Key

The scheduled post publisher (Edge Function) needs the service role key:

1. Go to your Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (NOT the anon key)
3. Update `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```
4. Also set it as a Supabase secret for Edge Functions:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
supabase secrets set API_KEY_ENCRYPTION_SECRET=your-encryption-secret
```

## Step 8: Run Database Migration

Run the `threads_accounts` migration in Supabase Dashboard → SQL Editor:
- File: `web/supabase/migrations/20260307000000_threads_accounts.sql`

## OAuth Flow Summary

```
User clicks "Connect Threads" →
  GET /api/threads/authorize →
    Redirect to threads.net/oauth/authorize →
      User authorizes →
        Redirect to /api/threads/callback?code=xxx →
          Exchange code for short-lived token (1hr) →
            Exchange for long-lived token (60 days) →
              Fetch profile (user ID, username) →
                Encrypt token & save to DB →
                  Redirect to /dashboard/settings
```

## Token Lifecycle

- **Short-lived token**: Valid for 1 hour. Exchanged immediately for long-lived token.
- **Long-lived token**: Valid for 60 days. Can be refreshed before expiry.
- **Token refresh**: Must happen before the 60-day expiry. Returns a new 60-day token.
- **Expired token**: If not refreshed in time, user must re-authorize through OAuth flow.

## API Rate Limits

- **Publishing**: 250 posts per 24-hour period per user
- **Replies**: 1,000 replies per 24-hour period per user
- **API calls**: Standard Graph API rate limiting applies

## Going Live

When ready for production:
1. Go to **App Review** in the Meta developer dashboard
2. Submit for review with required permissions
3. Once approved, switch app to **Live Mode**
4. Update `META_REDIRECT_URI` to your production URL

## Troubleshooting

- **"Invalid redirect_uri"**: Ensure the callback URL in `.env.local` exactly matches what's configured in the Meta app settings
- **"User not authorized"**: In development mode, the Threads account must be added as a test user
- **"Token expired"**: Use the refresh button in Settings, or reconnect the account
- **Posts not visible**: In development mode, API-created posts are only visible to test users

/**
 * Instagram Graph API (Business) authentication utilities.
 *
 * Uses the Instagram API with Instagram Login (Business) flow.
 * App: whaley-IG (App ID: 909360651643962)
 *
 * Setup:
 * 1. Created app at https://developers.facebook.com/apps
 * 2. Selected "Manage messaging & content on Instagram" use case
 * 3. Generated access token via API setup with Instagram business login
 * 4. Add to .env.local:
 *    - INSTAGRAM_APP_ID=909360651643962
 *    - INSTAGRAM_APP_SECRET=<your app secret>
 *    - INSTAGRAM_ACCESS_TOKEN=<your access token>
 */

/**
 * Get the Instagram access token from environment variables.
 */
export function getInstagramAccessToken(): string {
  return process.env.INSTAGRAM_ACCESS_TOKEN || "";
}

/**
 * Check if Instagram API credentials are configured.
 */
export function isInstagramConfigured(): boolean {
  return !!process.env.INSTAGRAM_ACCESS_TOKEN;
}

/**
 * Refresh Instagram long-lived access token before it expires (60 days).
 * Call this from a cron job every ~30 days.
 *
 * @returns New access token or null if refresh failed
 */
export async function refreshInstagramAccessToken(): Promise<string | null> {
  const currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!currentToken) {
    console.error("[Instagram Auth] No access token configured");
    return null;
  }

  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Instagram Auth] Token refresh failed:", errorData);
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;

    // Note: In production, persist this token to your database or secrets manager.
    process.env.INSTAGRAM_ACCESS_TOKEN = newToken;

    console.log("[Instagram Auth] Token refreshed successfully");
    return newToken;
  } catch (error) {
    console.error("[Instagram Auth] Error refreshing token:", error);
    return null;
  }
}

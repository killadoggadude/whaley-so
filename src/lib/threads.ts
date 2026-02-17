import { encrypt, decrypt } from "@/lib/crypto";
import type { TokenStatus } from "@/types";

// ============================================
// Environment helpers
// ============================================

function getMetaAppId(): string {
  const id = process.env.META_APP_ID;
  if (!id) throw new Error("META_APP_ID is not set");
  return id;
}

function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET is not set");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.META_REDIRECT_URI;
  if (!uri) throw new Error("META_REDIRECT_URI is not set");
  return uri;
}

// ============================================
// OAuth helpers
// ============================================

const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_read_replies",
  "threads_manage_replies",
];

/**
 * Build the Threads OAuth authorization URL.
 * The user will be redirected here to authorize the app.
 */
export function getThreadsAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    redirect_uri: getRedirectUri(),
    scope: THREADS_SCOPES.join(","),
    response_type: "code",
    state,
  });

  return `https://threads.net/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange the authorization code for a short-lived access token (1 hour).
 */
export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; user_id: string }> {
  const params = new URLSearchParams({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code,
  });

  const res = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    user_id: String(data.user_id),
  };
}

/**
 * Exchange a short-lived token for a long-lived token (60 days).
 */
export async function getLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: getMetaAppSecret(),
    access_token: shortLivedToken,
  });

  const res = await fetch(
    `https://graph.threads.net/access_token?${params.toString()}`
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to get long-lived token: ${error}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in, // seconds (~5,184,000 for 60 days)
  };
}

/**
 * Refresh a long-lived token before it expires.
 * Returns a new long-lived token valid for another 60 days.
 * Token must not be expired to refresh.
 */
export async function refreshLongLivedToken(
  token: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: token,
  });

  const res = await fetch(
    `https://graph.threads.net/refresh_access_token?${params.toString()}`
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

// ============================================
// Profile helpers
// ============================================

/**
 * Fetch the authenticated user's Threads profile.
 */
export async function getThreadsProfile(token: string): Promise<{
  id: string;
  username: string;
  threads_profile_picture_url: string;
}> {
  const res = await fetch(
    `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${token}`
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch Threads profile: ${error}`);
  }

  return res.json();
}

// ============================================
// Token encryption (reuses existing crypto)
// ============================================

/**
 * Encrypt a Threads access token for storage.
 * Uses the same AES-256-GCM encryption as API keys.
 */
export function encryptToken(token: string): string {
  return encrypt(token);
}

/**
 * Decrypt a stored Threads access token.
 */
export function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}

// ============================================
// Token status helpers
// ============================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Determine the status of a token based on its expiry date.
 */
export function getTokenStatus(expiresAt: string): TokenStatus {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const timeLeft = expiryDate.getTime() - now.getTime();

  if (timeLeft <= 0) return "expired";
  if (timeLeft <= SEVEN_DAYS_MS) return "expiring_soon";
  return "valid";
}

/**
 * Calculate the expiry date from a token's expires_in seconds value.
 */
export function calculateTokenExpiry(expiresInSeconds: number): string {
  const expiryDate = new Date(Date.now() + expiresInSeconds * 1000);
  return expiryDate.toISOString();
}

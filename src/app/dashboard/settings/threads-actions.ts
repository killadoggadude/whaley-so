"use server";

import { createClient } from "@/lib/supabase/server";
import {
  decryptToken,
  refreshLongLivedToken,
  encryptToken,
  getTokenStatus,
  calculateTokenExpiry,
} from "@/lib/threads";
import type { ThreadsAccountWithStatus } from "@/types";

/**
 * Fetch all Threads accounts for the current user.
 * Returns accounts with token status (never exposes decrypted tokens).
 */
export async function getThreadsAccountsAction(): Promise<{
  accounts: ThreadsAccountWithStatus[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("threads_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch Threads accounts: ${error.message}`);
  }

  const accounts: ThreadsAccountWithStatus[] = (data || []).map((account) => ({
    id: account.id,
    user_id: account.user_id,
    threads_user_id: account.threads_user_id,
    username: account.username,
    profile_pic_url: account.profile_pic_url,
    token_expires_at: account.token_expires_at,
    is_active: account.is_active,
    created_at: account.created_at,
    updated_at: account.updated_at,
    token_status: getTokenStatus(account.token_expires_at),
  }));

  return { accounts };
}

/**
 * Refresh the access token for a Threads account.
 * Decrypts the existing token, calls Meta API to refresh, re-encrypts and saves.
 */
export async function refreshTokenAction(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Fetch the account
  const { data: account, error: fetchError } = await supabase
    .from("threads_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !account) {
    return { success: false, error: "Account not found" };
  }

  try {
    // Decrypt existing token
    const currentToken = decryptToken(account.access_token);

    // Check if token is already expired (can't refresh expired tokens)
    const status = getTokenStatus(account.token_expires_at);
    if (status === "expired") {
      return {
        success: false,
        error: "Token has expired. Please reconnect your Threads account.",
      };
    }

    // Refresh the token
    const { access_token: newToken, expires_in } =
      await refreshLongLivedToken(currentToken);

    // Encrypt and save
    const encryptedToken = encryptToken(newToken);
    const tokenExpiresAt = calculateTokenExpiry(expires_in);

    const { error: updateError } = await supabase
      .from("threads_accounts")
      .update({
        access_token: encryptedToken,
        token_expires_at: tokenExpiresAt,
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: "Failed to save refreshed token" };
    }

    return { success: true };
  } catch (err) {
    console.error("Token refresh error:", err);
    return {
      success: false,
      error: "Failed to refresh token. Please reconnect your account.",
    };
  }
}

/**
 * Disconnect (delete) a Threads account.
 */
export async function disconnectThreadsAction(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("threads_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Failed to disconnect account" };
  }

  return { success: true };
}

/**
 * Toggle the is_active status of a Threads account.
 */
export async function toggleThreadsActiveAction(
  accountId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("threads_accounts")
    .update({ is_active: isActive })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Failed to update account" };
  }

  return { success: true };
}

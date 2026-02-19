import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";
import type { ApiService, MaskedApiKey } from "@/types";

/**
 * Get all API keys for the current user, masked for display.
 * Only returns service name, masked key, and timestamps.
 */
export async function getMaskedKeys(): Promise<MaskedApiKey[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("service, encrypted_api_key, created_at, updated_at")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }

  return (data || []).map((row) => ({
    service: row.service as ApiService,
    masked_key: maskApiKey(decrypt(row.encrypted_api_key)),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Get a decrypted API key for a specific service.
 * Server-side only — never expose to client.
 */
export async function getDecryptedKey(
  service: ApiService
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_api_key")
    .eq("user_id", user.id)
    .eq("service", service)
    .single();

  if (error || !data) {
    return null;
  }

  return decrypt(data.encrypted_api_key);
}

/**
 * Insert or update an API key for the current user.
 * Encrypts the key before storing.
 */
export async function upsertApiKey(
  service: ApiService,
  apiKey: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const encryptedKey = encrypt(apiKey);

  // Check if key already exists for this service
  const { data: existing } = await supabase
    .from("user_api_keys")
    .select("id")
    .eq("user_id", user.id)
    .eq("service", service)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("user_api_keys")
      .update({ encrypted_api_key: encryptedKey })
      .eq("user_id", user.id)
      .eq("service", service);

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("user_api_keys").insert({
      user_id: user.id,
      service,
      encrypted_api_key: encryptedKey,
    });

    if (error) {
      throw new Error(`Failed to save API key: ${error.message}`);
    }
  }
}

/**
 * Delete an API key for the current user.
 */
export async function deleteApiKey(service: ApiService): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("service", service);

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

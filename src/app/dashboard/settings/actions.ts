"use server";

import { revalidatePath } from "next/cache";
import {
  upsertApiKey,
  deleteApiKey as removeApiKey,
} from "@/lib/api-keys";
import type { ApiService } from "@/types";

export async function saveApiKeyAction(
  service: ApiService,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!apiKey || apiKey.trim().length === 0) {
      return { success: false, error: "API key cannot be empty" };
    }

    await upsertApiKey(service, apiKey.trim());
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save API key",
    };
  }
}

export async function deleteApiKeyAction(
  service: ApiService
): Promise<{ success: boolean; error?: string }> {
  try {
    await removeApiKey(service);
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete API key",
    };
  }
}

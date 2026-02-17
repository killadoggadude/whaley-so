"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CaptionPreset } from "@/types";

/**
 * Get all caption presets for the current user.
 */
export async function getCaptionPresetsAction(): Promise<{ presets: CaptionPreset[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { presets: [], error: "Not authenticated" };

    const { data, error } = await supabase
      .from("caption_presets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { presets: data || [] };
  } catch {
    return { presets: [], error: "Failed to fetch presets" };
  }
}

/**
 * Save a new caption preset for the current user.
 */
export async function saveCaptionPresetAction(
  name: string,
  settings: Record<string, unknown>
): Promise<{ preset: CaptionPreset | null; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { preset: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("caption_presets")
      .insert({ user_id: user.id, name, settings })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/dashboard/tools/talking-head");
    return { preset: data, error: undefined };
  } catch {
    return { preset: null, error: "Failed to save preset" };
  }
}

/**
 * Delete a caption preset.
 */
export async function deleteCaptionPresetAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("caption_presets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/tools/talking-head");
    return { success: true, error: undefined };
  } catch {
    return { success: false, error: "Failed to delete preset" };
  }
}
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Prompt, PromptWithSourceImage } from "@/types";

export async function savePromptsAction(
  prompts: {
    model_id: string | null;
    source_image_id: string | null;
    prompt_text: string;
    prompt_index: number;
    variation_label: string;
    metadata?: Record<string, unknown>;
  }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const rows = prompts.map((p) => ({
      user_id: user.id,
      model_id: p.model_id,
      source_image_id: p.source_image_id,
      prompt_text: p.prompt_text,
      prompt_index: p.prompt_index,
      variation_label: p.variation_label,
      metadata: p.metadata || {},
    }));

    const { error } = await supabase.from("prompts").insert(rows);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/tools/prompts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save prompts",
    };
  }
}

export async function getPromptsAction(filters?: {
  limit?: number;
  offset?: number;
}): Promise<{
  prompts: PromptWithSourceImage[];
  total: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { prompts: [], total: 0, error: "Not authenticated" };

    let query = supabase
      .from("prompts")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    query = query.order("created_at", { ascending: false });

    const limit = filters?.limit || 30;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return { prompts: [], total: 0, error: error.message };

    // Map to PromptWithSourceImage (no source image resolution needed for now)
    const prompts: PromptWithSourceImage[] = (data || []).map(
      (prompt: Prompt) => ({ ...prompt })
    );

    return { prompts, total: count || 0 };
  } catch (error) {
    return {
      prompts: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to fetch prompts",
    };
  }
}

export async function updatePromptAction(
  promptId: string,
  promptText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("prompts")
      .update({ prompt_text: promptText, is_edited: true })
      .eq("id", promptId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/tools/prompts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update prompt",
    };
  }
}

export async function deletePromptAction(
  promptId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("prompts")
      .delete()
      .eq("id", promptId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/tools/prompts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete prompt",
    };
  }
}

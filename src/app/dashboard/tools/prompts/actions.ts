"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Prompt, PromptWithSourceImage, Asset, AssetWithUrl } from "@/types";

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

    const rawPrompts: Prompt[] = data || [];

    // Collect unique source_image_id values
    const sourceImageIds = [
      ...new Set(
        rawPrompts
          .map((p) => p.source_image_id)
          .filter((id): id is string => id !== null)
      ),
    ];

    // Batch-fetch source image assets and generate signed URLs
    const sourceImageMap = new Map<string, AssetWithUrl>();

    if (sourceImageIds.length > 0) {
      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .in("id", sourceImageIds);

      if (assets && assets.length > 0) {
        // Generate signed URLs in batch
        const signedPaths = assets.map((a: Asset) => a.file_path);
        const { data: signedUrls } = await supabase.storage
          .from("assets")
          .createSignedUrls(signedPaths, 3600);

        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i] as Asset;
          const signedUrl = signedUrls?.[i]?.signedUrl || "";
          sourceImageMap.set(asset.id, { ...asset, signed_url: signedUrl });
        }
      }
    }

    // Map to PromptWithSourceImage with resolved source images
    const prompts: PromptWithSourceImage[] = rawPrompts.map(
      (prompt: Prompt) => ({
        ...prompt,
        source_image: prompt.source_image_id
          ? sourceImageMap.get(prompt.source_image_id)
          : undefined,
      })
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import type {
  AiModel,
  AiModelWithImages,
  Asset,
  AssetWithUrl,
  TtsSettings,
} from "@/types";

// Helper: resolve reference image IDs to AssetWithUrl[]
async function resolveReferenceImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  imageIds: string[]
): Promise<AssetWithUrl[]> {
  if (imageIds.length === 0) return [];

  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .in("id", imageIds)
    .eq("user_id", userId);

  if (!assets || assets.length === 0) return [];

  const withUrls: AssetWithUrl[] = await Promise.all(
    (assets as Asset[]).map(async (asset) => {
      try {
        const signed_url = await getSignedUrl(asset.file_path);
        return { ...asset, signed_url };
      } catch {
        return { ...asset, signed_url: "" };
      }
    })
  );

  // Maintain the original order from imageIds
  const byId = new Map(withUrls.map((a) => [a.id, a]));
  return imageIds.map((id) => byId.get(id)).filter(Boolean) as AssetWithUrl[];
}

export async function getModelsAction(): Promise<{
  models: AiModelWithImages[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { models: [], error: "Not authenticated" };

    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { models: [], error: error.message };

    const models: AiModelWithImages[] = await Promise.all(
      (data || []).map(async (model: AiModel) => {
        const reference_images = await resolveReferenceImages(
          supabase,
          user.id,
          model.reference_image_ids
        );
        return { ...model, reference_images };
      })
    );

    return { models };
  } catch (error) {
    return {
      models: [],
      error: error instanceof Error ? error.message : "Failed to fetch models",
    };
  }
}

export async function getModelAction(
  modelId: string
): Promise<{ model: AiModelWithImages | null; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { model: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single();

    if (error) return { model: null, error: error.message };

    const reference_images = await resolveReferenceImages(
      supabase,
      user.id,
      (data as AiModel).reference_image_ids
    );

    return { model: { ...(data as AiModel), reference_images } };
  } catch (error) {
    return {
      model: null,
      error: error instanceof Error ? error.message : "Failed to fetch model",
    };
  }
}

export async function createModelAction(data: {
  name: string;
  description: string;
  voice_id: string;
  voice_settings: TtsSettings;
  reference_image_ids: string[];
}): Promise<{ success: boolean; modelId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };
    if (!data.name.trim()) return { success: false, error: "Name is required" };

    // Validate reference image IDs belong to user
    if (data.reference_image_ids.length > 0) {
      const { data: assets } = await supabase
        .from("assets")
        .select("id")
        .in("id", data.reference_image_ids)
        .eq("user_id", user.id);

      const validIds = new Set((assets || []).map((a: { id: string }) => a.id));
      data.reference_image_ids = data.reference_image_ids.filter((id) =>
        validIds.has(id)
      );
    }

    const { data: inserted, error } = await supabase
      .from("ai_models")
      .insert({
        user_id: user.id,
        name: data.name.trim(),
        description: data.description.trim(),
        voice_id: data.voice_id.trim(),
        voice_settings: data.voice_settings,
        reference_image_ids: data.reference_image_ids,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/models");
    return { success: true, modelId: inserted.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create model",
    };
  }
}

export async function updateModelAction(
  modelId: string,
  data: {
    name: string;
    description: string;
    voice_id: string;
    voice_settings: TtsSettings;
    reference_image_ids: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };
    if (!data.name.trim()) return { success: false, error: "Name is required" };

    // Validate reference image IDs belong to user
    if (data.reference_image_ids.length > 0) {
      const { data: assets } = await supabase
        .from("assets")
        .select("id")
        .in("id", data.reference_image_ids)
        .eq("user_id", user.id);

      const validIds = new Set((assets || []).map((a: { id: string }) => a.id));
      data.reference_image_ids = data.reference_image_ids.filter((id) =>
        validIds.has(id)
      );
    }

    const { error } = await supabase
      .from("ai_models")
      .update({
        name: data.name.trim(),
        description: data.description.trim(),
        voice_id: data.voice_id.trim(),
        voice_settings: data.voice_settings,
        reference_image_ids: data.reference_image_ids,
      })
      .eq("id", modelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update model",
    };
  }
}

export async function deleteModelAction(
  modelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("ai_models")
      .delete()
      .eq("id", modelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete model",
    };
  }
}

export async function toggleModelActiveAction(
  modelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { data: model } = await supabase
      .from("ai_models")
      .select("is_active")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single();

    if (!model) return { success: false, error: "Model not found" };

    const { error } = await supabase
      .from("ai_models")
      .update({ is_active: !model.is_active })
      .eq("id", modelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/models");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle model status",
    };
  }
}

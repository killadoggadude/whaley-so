"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteStorageFile, getSignedUrl } from "@/lib/storage";
import type { Asset, AssetFilters, AssetWithUrl } from "@/types";

export async function getAssetsAction(
  filters?: AssetFilters
): Promise<{ assets: AssetWithUrl[]; total: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { assets: [], total: 0, error: "Not authenticated" };

    let query = supabase
      .from("assets")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (filters?.file_type) {
      query = query.eq("file_type", filters.file_type);
    }
    if (filters?.is_favorite !== undefined) {
      query = query.eq("is_favorite", filters.is_favorite);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }
    if (filters?.search) {
      query = query.ilike("filename", `%${filters.search}%`);
    }
    // Model filter: null = unassigned, string = specific model
    if (filters?.ai_model_id !== undefined) {
      if (filters.ai_model_id === null) {
        query = query.is("ai_model_id", null);
      } else {
        query = query.eq("ai_model_id", filters.ai_model_id);
      }
    }
    if (filters?.ids) {
      const ids = filters.ids.split(',');
      query = query.in('id', ids);
    }

    const sortBy = filters?.sort_by || "created_at";
    const sortOrder = filters?.sort_order || "desc";
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    const limit = filters?.limit || 24;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return { assets: [], total: 0, error: error.message };

    // Generate signed URLs
    const assetsWithUrls: AssetWithUrl[] = await Promise.all(
      (data || []).map(async (asset: Asset) => {
        try {
          const signed_url = await getSignedUrl(asset.file_path);
          return { ...asset, signed_url };
        } catch {
          return { ...asset, signed_url: "" };
        }
      })
    );

    return { assets: assetsWithUrls, total: count || 0 };
  } catch (error) {
    return {
      assets: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to fetch assets",
    };
  }
}

export async function toggleFavoriteAction(
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { data: asset } = await supabase
      .from("assets")
      .select("is_favorite")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (!asset) return { success: false, error: "Asset not found" };

    const { error } = await supabase
      .from("assets")
      .update({ is_favorite: !asset.is_favorite })
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle favorite",
    };
  }
}

export async function updateTagsAction(
  assetId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("assets")
      .update({ tags })
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update tags",
    };
  }
}

export async function deleteAssetAction(
  assetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { data: asset } = await supabase
      .from("assets")
      .select("file_path")
      .eq("id", assetId)
      .eq("user_id", user.id)
      .single();

    if (!asset) return { success: false, error: "Asset not found" };

    // Delete from storage first
    try {
      await deleteStorageFile(asset.file_path);
    } catch {
      console.error("Failed to delete storage file:", asset.file_path);
    }

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", assetId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete asset",
    };
  }
}

export async function getUserTagsAction(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
      .from("assets")
      .select("tags")
      .eq("user_id", user.id);

    if (!data) return [];

    const allTags = data.flatMap((row) => row.tags || []);
    return [...new Set(allTags)].sort();
  } catch {
    return [];
  }
}

// ----- Bulk Operations -----

export async function bulkDeleteAssetsAction(
  assetIds: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return { success: false, deletedCount: 0, error: "Not authenticated" };

    if (assetIds.length === 0)
      return { success: false, deletedCount: 0, error: "No assets specified" };

    // Fetch file_paths for storage deletion
    const { data: assets } = await supabase
      .from("assets")
      .select("id, file_path")
      .in("id", assetIds)
      .eq("user_id", user.id);

    if (!assets || assets.length === 0)
      return { success: false, deletedCount: 0, error: "No assets found" };

    // Delete from storage (batch)
    const filePaths = assets.map((a) => a.file_path);
    try {
      await supabase.storage.from("assets").remove(filePaths);
    } catch {
      console.error("Failed to batch-delete storage files");
    }

    // Delete from DB
    const validIds = assets.map((a) => a.id);
    const { error } = await supabase
      .from("assets")
      .delete()
      .in("id", validIds)
      .eq("user_id", user.id);

    if (error)
      return { success: false, deletedCount: 0, error: error.message };

    revalidatePath("/dashboard/assets");
    return { success: true, deletedCount: validIds.length };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error:
        error instanceof Error ? error.message : "Failed to bulk delete assets",
    };
  }
}

export async function bulkAssignModelAction(
  assetIds: string[],
  modelId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    if (assetIds.length === 0)
      return { success: false, error: "No assets specified" };

    // Validate modelId belongs to user (if not null)
    if (modelId) {
      const { data: model } = await supabase
        .from("ai_models")
        .select("id")
        .eq("id", modelId)
        .eq("user_id", user.id)
        .single();
      if (!model) return { success: false, error: "Model not found" };
    }

    const { error } = await supabase
      .from("assets")
      .update({ ai_model_id: modelId })
      .in("id", assetIds)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/assets");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to assign model to assets",
    };
  }
}

export async function getSignedUrlsAction(
  assetIds: string[]
): Promise<{
  urls: { id: string; filename: string; url: string }[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { urls: [], error: "Not authenticated" };

    if (assetIds.length === 0)
      return { urls: [], error: "No assets specified" };

    const { data: assets } = await supabase
      .from("assets")
      .select("id, filename, file_path")
      .in("id", assetIds)
      .eq("user_id", user.id);

    if (!assets || assets.length === 0)
      return { urls: [], error: "No assets found" };

    const urls = await Promise.all(
      assets.map(async (asset) => {
        try {
          const url = await getSignedUrl(asset.file_path);
          return { id: asset.id, filename: asset.filename, url };
        } catch {
          return { id: asset.id, filename: asset.filename, url: "" };
        }
      })
    );

    return { urls: urls.filter((u) => u.url) };
  } catch (error) {
    return {
      urls: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to get download URLs",
    };
  }
}

export async function getModelsListAction(): Promise<{
  models: { id: string; name: string }[];
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
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) return { models: [], error: error.message };
    return { models: data || [] };
  } catch (error) {
    return {
      models: [],
      error:
        error instanceof Error ? error.message : "Failed to fetch models",
    };
  }
}

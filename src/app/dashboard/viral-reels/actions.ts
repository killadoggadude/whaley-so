"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  extractInstagramShortcode,
  detectPlatform,
  isValidInstagramReelUrl,
} from "@/lib/viral-reels";
import { fetchThumbnailForReel } from "@/lib/thumbnail";
import { fetchViewCount } from "@/lib/view-count";
import { detectContentType } from "@/lib/content-type";
import type { ViralReel, ViralReelFilters } from "@/types";

// ---- GET (list with filters) ----

export async function getViralReelsAction(
  filters?: ViralReelFilters
): Promise<{ reels: ViralReel[]; total: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { reels: [], total: 0, error: "Not authenticated" };

    let query = supabase
      .from("viral_reels")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    if (filters?.search) {
      query = query.ilike("notes", `%${filters.search}%`);
    }
    if (filters?.is_favorite !== undefined) {
      query = query.eq("is_favorite", filters.is_favorite);
    }
    if (filters?.min_views !== undefined) {
      query = query.gte("view_count", filters.min_views);
    }
    if (filters?.max_views !== undefined) {
      query = query.lte("view_count", filters.max_views);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    const limit = filters?.limit || 12;
    const offset = filters?.offset || 0;
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return { reels: [], total: 0, error: error.message };

    return { reels: (data as ViralReel[]) || [], total: count || 0 };
  } catch (error) {
    return {
      reels: [],
      total: 0,
      error:
        error instanceof Error ? error.message : "Failed to fetch viral reels",
    };
  }
}

// ---- CREATE ----

export async function addViralReelAction(data: {
  url: string;
  notes?: string;
  tags?: string[];
  viewCount?: number;
}): Promise<{ reel?: ViralReel; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Validate URL
    const trimmedUrl = data.url.trim();
    if (!trimmedUrl) return { error: "URL is required" };

    const platform = detectPlatform(trimmedUrl);
    if (!platform) return { error: "Unsupported URL. Please use an Instagram reel link." };

    if (platform === "instagram" && !isValidInstagramReelUrl(trimmedUrl)) {
      return { error: "Invalid Instagram reel URL. Use format: instagram.com/reel/..." };
    }

    // Extract shortcode for deduplication
    const shortcode =
      platform === "instagram" ? extractInstagramShortcode(trimmedUrl) : null;

    const { data: reel, error } = await supabase
      .from("viral_reels")
      .insert({
        user_id: user.id,
        url: trimmedUrl,
        platform,
        shortcode,
        notes: data.notes?.trim() || "",
        tags: data.tags || [],
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (duplicate reel)
      if (error.code === "23505") {
        return { error: "You've already saved this reel." };
      }
      return { error: error.message };
    }

    // Fetch view count (no approval logic anymore)
    try {
      // Use manual view count if provided, otherwise try scraping
      let viewCount = data.viewCount || 0;
      if (!viewCount) {
        viewCount = await fetchViewCount(trimmedUrl, platform);
      }

      // Use user-provided tags only
      const allTags = data.tags || [];

      await supabase
        .from("viral_reels")
        .update({
          view_count: viewCount,
          tags: allTags,
        })
        .eq("id", reel.id);

      // Update local reel object
      (reel as ViralReel).view_count = viewCount;
      (reel as ViralReel).tags = allTags;
    } catch (error) {
      // View count fetch failed - continue with reel creation (use manual count if provided)
      console.error("Failed to fetch view count:", error);
    }

    // Fetch and store thumbnail in background (non-blocking for user)
    try {
      const thumbBuffer = await fetchThumbnailForReel(
        trimmedUrl,
        platform,
        shortcode
      );

      if (thumbBuffer && reel) {
        const filePath = `thumbnails/viral-reels/${reel.id}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(filePath, thumbBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadError) {
          await supabase
            .from("viral_reels")
            .update({ thumbnail_url: filePath })
            .eq("id", reel.id);

          (reel as ViralReel).thumbnail_url = filePath;
        }
      }
    } catch {
      // Thumbnail fetch failed silently — reel is still saved
    }

    revalidatePath("/dashboard/viral-reels");
    return { reel: reel as ViralReel };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to add viral reel",
    };
  }
}

// ---- UPDATE (notes/tags) ----

export async function updateViralReelAction(
  reelId: string,
  data: { notes?: string; tags?: string[]; viewCount?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.notes !== undefined) updateData.notes = data.notes.trim();
    if (data.tags !== undefined) updateData.tags = data.tags;

    const { error } = await supabase
      .from("viral_reels")
      .update(updateData)
      .eq("id", reelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/viral-reels");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update viral reel",
    };
  }
}

// ---- TOGGLE FAVORITE ----

export async function toggleReelFavoriteAction(
  reelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { data: reel } = await supabase
      .from("viral_reels")
      .select("is_favorite")
      .eq("id", reelId)
      .eq("user_id", user.id)
      .single();

    if (!reel) return { success: false, error: "Reel not found" };

    const { error } = await supabase
      .from("viral_reels")
      .update({ is_favorite: !reel.is_favorite })
      .eq("id", reelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/viral-reels");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle favorite",
    };
  }
}

// ---- DELETE (single) ----

export async function deleteViralReelAction(
  reelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("viral_reels")
      .delete()
      .eq("id", reelId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/viral-reels");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete viral reel",
    };
  }
}

// ---- BULK DELETE ----

export async function bulkDeleteReelsAction(
  reelIds: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return { success: false, deletedCount: 0, error: "Not authenticated" };

    if (reelIds.length === 0)
      return { success: false, deletedCount: 0, error: "No reels specified" };

    const { error, count } = await supabase
      .from("viral_reels")
      .delete({ count: "exact" })
      .in("id", reelIds)
      .eq("user_id", user.id);

    if (error)
      return { success: false, deletedCount: 0, error: error.message };

    revalidatePath("/dashboard/viral-reels");
    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to bulk delete viral reels",
    };
  }
}

// ---- GET USER TAGS (for filter dropdown) ----

export async function getReelTagsAction(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
      .from("viral_reels")
      .select("tags")
      .eq("user_id", user.id);

    if (!data) return [];

    const allTags = data.flatMap((row) => row.tags || []);
    return [...new Set(allTags)].sort();
  } catch {
    return [];
  }
}

// ---- CURATED REELS (Admin + Paid Users) ----

export async function getCuratedReelsAction(filters?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reels: ViralReel[]; total: number; error?: string; isPaid?: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { reels: [], total: 0, error: "Not authenticated", isPaid: false };

    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPaid = userProfile?.subscription_tier && userProfile.subscription_tier !== "free";

    let query = supabase
      .from("viral_reels")
      .select("*", { count: "exact" })
      .eq("is_curated", true);

    if (filters?.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.order("view_count", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) return { reels: [], total: 0, error: error.message, isPaid };

    return { reels: (data as ViralReel[]) || [], total: count || 0, isPaid };
  } catch (error) {
    return {
      reels: [],
      total: 0,
      error: error instanceof Error ? error.message : "Failed to fetch curated reels",
      isPaid: false,
    };
  }
}

export async function addCuratedReelAction(data: {
  url: string;
  category?: "talking_head" | "dancing" | "motion_control" | "general";
  notes?: string;
  tags?: string[];
  viewCount?: number;
}): Promise<{ reel?: ViralReel; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    const { data: userProfile } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    const trimmedUrl = data.url.trim();
    if (!trimmedUrl) return { error: "URL is required" };

    const platform = detectPlatform(trimmedUrl);
    if (!platform) return { error: "Unsupported URL. Please use an Instagram reel link." };

    if (platform === "instagram" && !isValidInstagramReelUrl(trimmedUrl)) {
      return { error: "Invalid Instagram reel URL. Use format: instagram.com/reel/..." };
    }

    const shortcode = platform === "instagram" ? extractInstagramShortcode(trimmedUrl) : null;

    const { data: reel, error } = await supabase
      .from("viral_reels")
      .insert({
        user_id: user.id,
        url: trimmedUrl,
        platform,
        shortcode,
        notes: data.notes?.trim() || "",
        tags: data.tags || [],
        is_curated: true,
        category: data.category || "talking_head",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "This reel is already in the library." };
      }
      return { error: error.message };
    }

    let viewCount = data.viewCount || 0;
    if (!viewCount) {
      try {
        viewCount = await fetchViewCount(trimmedUrl, platform);
      } catch {
        console.error("Failed to fetch view count");
      }
    }

    await supabase
      .from("viral_reels")
      .update({ view_count: viewCount })
      .eq("id", reel.id);

    (reel as ViralReel).view_count = viewCount;

    try {
      const thumbBuffer = await fetchThumbnailForReel(trimmedUrl, platform, shortcode);
      if (thumbBuffer && reel) {
        const filePath = `thumbnails/viral-reels/${reel.id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(filePath, thumbBuffer, { contentType: "image/jpeg", upsert: true });

        if (!uploadError) {
          await supabase.from("viral_reels").update({ thumbnail_url: filePath }).eq("id", reel.id);
          (reel as ViralReel).thumbnail_url = filePath;
        }
      }
    } catch {
      // Thumbnail fetch failed silently
    }

    revalidatePath("/dashboard/viral-reels");
    return { reel: reel as ViralReel };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add curated reel",
    };
  }
}

export async function getUserSubscriptionAction(): Promise<{
  tier: string;
  isPaid: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { tier: "free", isPaid: false, error: "Not authenticated" };

    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = userProfile?.subscription_tier || "free";
    const isPaid = tier !== "free";

    return { tier, isPaid };
  } catch (error) {
    return {
      tier: "free",
      isPaid: false,
      error: error instanceof Error ? error.message : "Failed to get subscription",
    };
  }
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AddReelForm } from "./add-reel-form";
import { ReelFilters } from "./reel-filters";
import { ReelGrid } from "./reel-grid";
import { ReelBulkActionBar } from "./reel-bulk-action-bar";
import { ReelDetailDialog } from "./reel-detail-dialog";
import {
  getViralReelsAction,
  toggleReelFavoriteAction,
  deleteViralReelAction,
  bulkDeleteReelsAction,
  getReelTagsAction,
} from "@/app/dashboard/viral-reels/actions";
import { toast } from "sonner";
import type { ViralReel, ViralReelFilters as Filters } from "@/types";

interface ViralReelsLibraryProps {
  initialReels: ViralReel[];
  initialTotal: number;
}

export function ViralReelsLibrary({
  initialReels,
  initialTotal,
}: ViralReelsLibraryProps) {
  const router = useRouter();
  const [reels, setReels] = useState<ViralReel[]>(initialReels);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [minViews, setMinViews] = useState<number | undefined>();
  const [maxViews, setMaxViews] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Detail dialog
  const [editingReel, setEditingReel] = useState<ViralReel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search
  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  const buildFilters = useCallback(
    (offset = 0): Filters => {
      return {
        search: search || undefined,
        is_favorite: favoritesOnly ? true : undefined,
        min_views: minViews,
        max_views: maxViews,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        limit: 12,
        offset,
      };
    },
    [search, favoritesOnly, minViews, maxViews, selectedTags]
  );

  const fetchReels = useCallback(
    async (append = false) => {
      setLoading(true);
      const offset = append ? reels.length : 0;
      const result = await getViralReelsAction(buildFilters(offset));
      if (result.error) {
        toast.error(result.error);
      } else if (append) {
        setReels((prev) => [...prev, ...result.reels]);
      } else {
        setReels(result.reels);
      }
      setTotal(result.total);
      setLoading(false);
    },
    [buildFilters, reels.length]
  );

  // Fetch available tags on mount
  useEffect(() => {
    getReelTagsAction().then(setAvailableTags);
  }, []);

  // Refetch when filters change (except search which is debounced)
  useEffect(() => {
    setSelectedIds(new Set());
    fetchReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesOnly, minViews, maxViews, selectedTags]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSelectedIds(new Set());
      fetchReels();
    }, 300);
  };

  // ----- Handlers -----

  const handleReelAdded = (reel: ViralReel) => {
    setReels((prev) => [reel, ...prev]);
    setTotal((prev) => prev + 1);
  };

  const handleFavorite = async (id: string) => {
    const result = await toggleReelFavoriteAction(id);
    if (result.success) {
      setReels((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_favorite: !r.is_favorite } : r
        )
      );
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteViralReelAction(id);
    if (result.success) {
      setReels((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Reel deleted");
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (reel: ViralReel) => {
    setEditingReel(reel);
    setDialogOpen(true);
  };

  const handleRecreate = (reel: ViralReel) => {
    const params = new URLSearchParams({ reelUrl: reel.url });
    router.push(`/dashboard/tools/talking-head?${params.toString()}`);
  };

  // ----- Selection handlers -----

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!selectionMode) setSelectionMode(true);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(reels.map((r) => r.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleSelectionModeToggle = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const result = await bulkDeleteReelsAction(ids);
    if (result.success) {
      setReels((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setTotal((prev) => prev - result.deletedCount);
      setSelectedIds(new Set());
      toast.success(`Deleted ${result.deletedCount} reels`);
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <AddReelForm onReelAdded={handleReelAdded} />

      <ReelFilters
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={() => setFavoritesOnly(!favoritesOnly)}
        selectionMode={selectionMode}
        onSelectionModeToggle={handleSelectionModeToggle}
        totalCount={total}
        minViews={minViews}
        onMinViewsChange={setMinViews}
        maxViews={maxViews}
        onMaxViewsChange={setMaxViews}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
      />

      <ReelGrid
        reels={reels}
        total={total}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onFavorite={handleFavorite}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onRecreate={handleRecreate}
        onLoadMore={() => fetchReels(true)}
        loading={loading}
      />

      <ReelDetailDialog
        reel={editingReel}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdated={() => fetchReels()}
        onRecreate={handleRecreate}
      />

      <ReelBulkActionBar
        selectedCount={selectedIds.size}
        totalCount={total}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        deleting={deleting}
      />
    </div>
  );
}

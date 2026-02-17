"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AssetUpload } from "@/components/assets/asset-upload";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetGrid } from "@/components/assets/asset-grid";
import { AssetDetailDialog } from "@/components/assets/asset-detail-dialog";
import { BulkActionBar } from "@/components/assets/bulk-action-bar";
import {
  getAssetsAction,
  toggleFavoriteAction,
  deleteAssetAction,
  bulkDeleteAssetsAction,
  bulkAssignModelAction,
  getSignedUrlsAction,
} from "@/app/dashboard/assets/actions";
import { toast } from "sonner";
import type { AssetWithUrl, AssetFileType, AssetFilters as Filters } from "@/types";

interface AssetLibraryProps {
  initialAssets: AssetWithUrl[];
  initialTotal: number;
  userTags: string[];
  aiModels: { id: string; name: string }[];
}

export function AssetLibrary({
  initialAssets,
  initialTotal,
  userTags,
  aiModels,
}: AssetLibraryProps) {
  const [assets, setAssets] = useState<AssetWithUrl[]>(initialAssets);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState<AssetFileType | undefined>();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState("created_at-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modelFilter, setModelFilter] = useState<string | undefined>();

  // Detail dialog
  const [selectedAsset, setSelectedAsset] = useState<AssetWithUrl | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Debounce search
  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  const buildFilters = useCallback(
    (offset = 0): Filters => {
      const [sort_by, sort_order] = sortBy.split("-") as [
        Filters["sort_by"],
        Filters["sort_order"],
      ];
      return {
        file_type: fileType,
        is_favorite: favoritesOnly ? true : undefined,
        search: search || undefined,
        ai_model_id:
          modelFilter === "__unassigned__"
            ? null
            : modelFilter || undefined,
        sort_by: sort_by as Filters["sort_by"],
        sort_order: sort_order as Filters["sort_order"],
        limit: 24,
        offset,
      };
    },
    [fileType, favoritesOnly, search, sortBy, modelFilter]
  );

  const fetchAssets = useCallback(
    async (append = false) => {
      setLoading(true);
      const offset = append ? assets.length : 0;
      const result = await getAssetsAction(buildFilters(offset));
      if (result.error) {
        toast.error(result.error);
      } else if (append) {
        setAssets((prev) => [...prev, ...result.assets]);
      } else {
        setAssets(result.assets);
      }
      setTotal(result.total);
      setLoading(false);
    },
    [buildFilters, assets.length]
  );

  // Refetch when filters change (except search which is debounced)
  useEffect(() => {
    setSelectedIds(new Set());
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileType, favoritesOnly, sortBy, modelFilter]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSelectedIds(new Set());
      fetchAssets();
    }, 300);
  };

  const handleFavorite = async (id: string) => {
    const result = await toggleFavoriteAction(id);
    if (result.success) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, is_favorite: !a.is_favorite } : a
        )
      );
      if (selectedAsset?.id === id) {
        setSelectedAsset((prev) =>
          prev ? { ...prev, is_favorite: !prev.is_favorite } : prev
        );
      }
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAssetAction(id);
    if (result.success) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Asset deleted");
    } else {
      toast.error(result.error);
    }
  };

  const handleClick = (asset: AssetWithUrl) => {
    setSelectedAsset(asset);
    setDialogOpen(true);
  };

  // ----- Selection handlers -----

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Auto-enter selection mode if not already
    if (!selectionMode) setSelectionMode(true);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(assets.map((a) => a.id)));
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

  // ----- Bulk operation handlers -----

  const handleBulkDownload = async () => {
    setDownloading(true);
    const ids = Array.from(selectedIds);
    const result = await getSignedUrlsAction(ids);
    if (result.error) {
      toast.error(result.error);
    } else {
      // Trigger sequential downloads with small delay
      for (const item of result.urls) {
        const a = document.createElement("a");
        a.href = item.url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success(`Downloading ${result.urls.length} files`);
    }
    setDownloading(false);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const result = await bulkDeleteAssetsAction(ids);
    if (result.success) {
      setAssets((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setTotal((prev) => prev - result.deletedCount);
      setSelectedIds(new Set());
      toast.success(`Deleted ${result.deletedCount} assets`);
    } else {
      toast.error(result.error);
    }
    setDeleting(false);
  };

  const handleBulkAssignModel = async (modelId: string | null) => {
    setAssigning(true);
    const ids = Array.from(selectedIds);
    const result = await bulkAssignModelAction(ids, modelId);
    if (result.success) {
      const modelName = modelId
        ? aiModels.find((m) => m.id === modelId)?.name || "model"
        : "no model";
      toast.success(`Assigned ${ids.length} assets to ${modelName}`);
      setSelectedIds(new Set());
      // Refetch to update filtered views
      fetchAssets();
    } else {
      toast.error(result.error);
    }
    setAssigning(false);
  };

  // Handle model filter change — "__unassigned__" maps to a special value
  const handleModelChange = (value: string | undefined) => {
    setModelFilter(value);
  };

  return (
    <div className="space-y-6">
      <AssetUpload onUploadComplete={() => fetchAssets()} />

      <AssetFilters
        search={search}
        onSearchChange={handleSearchChange}
        fileType={fileType}
        onFileTypeChange={setFileType}
        favoritesOnly={favoritesOnly}
        onFavoritesToggle={() => setFavoritesOnly(!favoritesOnly)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        aiModels={aiModels}
        selectedModelId={modelFilter}
        onModelChange={handleModelChange}
        selectionMode={selectionMode}
        onSelectionModeToggle={handleSelectionModeToggle}
      />

      <AssetGrid
        assets={assets}
        total={total}
        viewMode={viewMode}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onLoadMore={() => fetchAssets(true)}
        onFavorite={handleFavorite}
        onDelete={handleDelete}
        onClick={handleClick}
        loading={loading}
      />

      <AssetDetailDialog
        asset={selectedAsset}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFavorite={handleFavorite}
        onDelete={handleDelete}
        aiModels={aiModels}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={total}
        aiModels={aiModels}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
        onBulkAssignModel={handleBulkAssignModel}
        downloading={downloading}
        deleting={deleting}
        assigning={assigning}
      />
    </div>
  );
}

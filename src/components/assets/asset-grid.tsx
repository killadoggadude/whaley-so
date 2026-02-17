"use client";

import { AssetCard } from "@/components/assets/asset-card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { AssetWithUrl } from "@/types";

interface AssetGridProps {
  assets: AssetWithUrl[];
  total: number;
  viewMode: "grid" | "list";
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (asset: AssetWithUrl) => void;
  loading: boolean;
}

export function AssetGrid({
  assets,
  total,
  viewMode,
  selectionMode,
  selectedIds,
  onSelect,
  onLoadMore,
  onFavorite,
  onDelete,
  onClick,
  loading,
}: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No assets yet</p>
        <p className="text-xs text-muted-foreground">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Showing {assets.length} of {total} assets
        {selectedIds.size > 0 && (
          <span className="text-accent-blue font-medium">
            {" "}({selectedIds.size} selected)
          </span>
        )}
      </p>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              viewMode="grid"
              selectionMode={selectionMode}
              selected={selectedIds.has(asset.id)}
              onSelect={onSelect}
              onFavorite={onFavorite}
              onDelete={onDelete}
              onClick={onClick}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              viewMode="list"
              selectionMode={selectionMode}
              selected={selectedIds.has(asset.id)}
              onSelect={onSelect}
              onFavorite={onFavorite}
              onDelete={onDelete}
              onClick={onClick}
            />
          ))}
        </div>
      )}

      {assets.length < total && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

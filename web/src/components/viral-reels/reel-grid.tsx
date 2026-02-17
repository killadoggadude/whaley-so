"use client";

import { Button } from "@/components/ui/button";
import { Flame, Loader2 } from "lucide-react";
import { ReelCard } from "./reel-card";
import type { ViralReel } from "@/types";

interface ReelGridProps {
  reels: ViralReel[];
  total: number;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (reel: ViralReel) => void;
  onRecreate: (reel: ViralReel) => void;
  onLoadMore: () => void;
  loading: boolean;
}

export function ReelGrid({
  reels,
  total,
  selectionMode,
  selectedIds,
  onSelect,
  onFavorite,
  onDelete,
  onEdit,
  onRecreate,
  onLoadMore,
  loading,
}: ReelGridProps) {
  if (reels.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Flame className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-1">
          No saved reels yet
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-md">
          Paste an Instagram reel URL above to start building your inspiration
          library. Find viral talking head reels and recreate them with your AI
          models.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {reels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            selectionMode={selectionMode}
            selected={selectedIds.has(reel.id)}
            onSelect={onSelect}
            onFavorite={onFavorite}
            onDelete={onDelete}
            onEdit={onEdit}
            onRecreate={onRecreate}
          />
        ))}
      </div>

      {/* Load more */}
      {reels.length < total && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Load More ({reels.length} of {total})
          </Button>
        </div>
      )}
    </div>
  );
}

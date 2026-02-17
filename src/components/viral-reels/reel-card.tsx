"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  Trash2,
  Video,
  Pencil,
  ExternalLink,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatTagLabel, getTagColor } from "@/lib/utils";
import { getThumbnailProxyUrl } from "@/lib/thumbnail";
import { formatViewCount } from "@/lib/view-count";
import type { ViralReel } from "@/types";

const VIEW_COUNT_TIERS = {
  low: { label: "low", color: "bg-yellow-600" },
  medium: { label: "100K+", color: "bg-green-600" },
  high: { label: "500K+", color: "bg-blue-600" },
  viral: { label: "1M+", color: "bg-purple-600" },
};

function getViewCountTier(viewCount: number): { label: string; color: string } | null {
  if (viewCount === 0) return null;
  if (viewCount < 100000) return VIEW_COUNT_TIERS.low;
  if (viewCount < 500000) return VIEW_COUNT_TIERS.medium;
  if (viewCount < 1000000) return VIEW_COUNT_TIERS.high;
  return VIEW_COUNT_TIERS.viral;
}

interface ReelCardProps {
  reel: ViralReel;
  selectionMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (reel: ViralReel) => void;
  onRecreate: (reel: ViralReel) => void;
}

export function ReelCard({
  reel,
  selectionMode,
  selected,
  onSelect,
  onFavorite,
  onDelete,
  onEdit,
  onRecreate,
}: ReelCardProps) {
  const [imgError, setImgError] = useState(false);
  const [storedImgError, setStoredImgError] = useState(false);

  // Prefer stored thumbnail, fall back to live proxy
  const storedThumbnailUrl = reel.thumbnail_url
    ? `/api/viral-reels/stored-thumbnail?path=${encodeURIComponent(reel.thumbnail_url)}`
    : null;
  const proxyThumbnailUrl = getThumbnailProxyUrl(reel.url, reel.platform, reel.shortcode);
  const thumbnailUrl = (storedThumbnailUrl && !storedImgError)
    ? storedThumbnailUrl
    : proxyThumbnailUrl;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card border border-border transition-colors duration-200 hover:bg-card-hover",
        selected && "ring-2 ring-accent-blue"
      )}
    >
      {/* Selection checkbox */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10",
          selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(reel.id)}
          className="h-5 w-5 border-2 bg-background/80 backdrop-blur"
        />
      </div>

      {/* Thumbnail with play overlay */}
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-[9/16] bg-muted overflow-hidden"
      >
        {thumbnailUrl && !imgError ? (
          <img
            src={thumbnailUrl}
            alt="Reel thumbnail"
            className="w-full h-full object-cover"
            onError={() => {
              if (storedThumbnailUrl && !storedImgError) {
                setStoredImgError(true);
              } else {
                setImgError(true);
              }
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="rounded-full bg-white/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="h-6 w-6 text-black fill-black" />
          </div>
        </div>

        {/* Open on Instagram badge */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur px-2 py-1 text-white text-[10px] capitalize">
            <ExternalLink className="h-3 w-3" />
            {reel.platform}
          </div>
        </div>

        {/* View count badge with color tiers */}
        <div className="absolute bottom-2 left-2">
          {(() => {
            const tier = getViewCountTier(reel.view_count || 0);
            const views = formatViewCount(reel.view_count || 0);
            
            if (!tier) {
              return (
                <Badge
                  variant="secondary"
                  className="text-xs bg-gray-600 backdrop-blur text-white border-none h-6 px-2"
                >
                  {views} views
                </Badge>
              );
            }
            
            return (
              <Badge
                variant="secondary"
                className={`text-xs backdrop-blur text-white border-none ${tier.color} h-6 px-2`}
              >
                {tier.label}
              </Badge>
            );
          })()}
        </div>
      </a>

      {/* Info + Actions */}
      <div className="p-3 space-y-2">
        {/* Notes */}
        {reel.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {reel.notes}
          </p>
        )}

        {/* Tags */}
        {reel.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {reel.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4 ${getTagColor(tag)}`}
              >
                {formatTagLabel(tag)}
              </Badge>
            ))}
          </div>
        )}

        {/* Date */}
        <p className="text-[10px] text-muted-foreground">
          {formatDate(reel.created_at)}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onFavorite(reel.id)}
              title={
                reel.is_favorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  reel.is_favorite && "fill-yellow-400 text-yellow-400"
                )}
              />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(reel)}
              title="Edit notes & tags"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(reel.id)}
              title="Delete reel"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Recreate button */}
          <Button size="sm" onClick={() => onRecreate(reel)}>
            <Video className="h-3.5 w-3.5 mr-1" />
            Recreate
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Star, Trash2, Image, Music, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatFileSize, formatDate, formatTagLabel, getTagColor } from "@/lib/utils";
import type { AssetWithUrl } from "@/types";

const FILE_TYPE_ICONS = {
  image: Image,
  audio: Music,
  video: Video,
  document: FileText,
};

interface AssetCardProps {
  asset: AssetWithUrl;
  viewMode: "grid" | "list";
  selectionMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (asset: AssetWithUrl) => void;
}

export function AssetCard({
  asset,
  viewMode,
  selectionMode,
  selected,
  onSelect,
  onFavorite,
  onDelete,
  onClick,
}: AssetCardProps) {
  const Icon = FILE_TYPE_ICONS[asset.file_type];

  const renderThumbnail = () => {
    if (asset.file_type === "image" && asset.signed_url) {
      return (
        <img
          src={asset.signed_url}
          alt={asset.filename}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  };

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group flex items-center gap-4 rounded-lg bg-card border border-border p-3 cursor-pointer transition-colors duration-200 hover:bg-card-hover",
          selected && "bg-accent-blue/5 ring-2 ring-accent-blue"
        )}
        onClick={() => (selectionMode ? onSelect(asset.id) : onClick(asset))}
      >
        {/* Checkbox */}
        <div
          className={cn(
            "flex-shrink-0 transition-opacity",
            selectionMode
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(asset.id)}
          />
        </div>

        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
          {renderThumbnail()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{asset.filename}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(asset.file_size)}</span>
            <span>{formatDate(asset.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {asset.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className={`text-xs ${getTagColor(tag)}`}>
              {formatTagLabel(tag)}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(asset.id);
            }}
          >
            <Star
              className={cn(
                "h-4 w-4",
                asset.is_favorite && "fill-yellow-400 text-yellow-400"
              )}
            />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-card border border-border cursor-pointer transition-colors duration-200 hover:bg-card-hover",
        selected && "ring-2 ring-accent-blue"
      )}
      onClick={() => (selectionMode ? onSelect(asset.id) : onClick(asset))}
    >
      {/* Selection checkbox */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10 transition-opacity",
          selectionMode
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(asset.id)}
          className="bg-background/80 border-foreground/30"
        />
      </div>

      <div className="aspect-square overflow-hidden">{renderThumbnail()}</div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none">
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(asset.id);
            }}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                asset.is_favorite && "fill-yellow-400 text-yellow-400"
              )}
            />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(asset.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{asset.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(asset.file_size)}
        </p>
        {asset.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className={`text-[10px] px-1 py-0 ${getTagColor(tag)}`}>
                {formatTagLabel(tag)}
              </Badge>
            ))}
            {asset.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{asset.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

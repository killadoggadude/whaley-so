"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, LayoutGrid, List, Search, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetFileType } from "@/types";

const FILE_TYPES: { label: string; value: AssetFileType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Audio", value: "audio" },
  { label: "Video", value: "video" },
  { label: "Documents", value: "document" },
];

interface AssetFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  fileType: AssetFileType | undefined;
  onFileTypeChange: (value: AssetFileType | undefined) => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  // AI Model filter
  aiModels: { id: string; name: string }[];
  selectedModelId: string | undefined;
  onModelChange: (modelId: string | undefined) => void;
  // Selection mode
  selectionMode: boolean;
  onSelectionModeToggle: () => void;
}

export function AssetFilters({
  search,
  onSearchChange,
  fileType,
  onFileTypeChange,
  favoritesOnly,
  onFavoritesToggle,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  aiModels,
  selectedModelId,
  onModelChange,
  selectionMode,
  onSelectionModeToggle,
}: AssetFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* File type filter */}
      <div className="flex rounded-md border border-border">
        {FILE_TYPES.map((type) => (
          <Button
            key={type.value}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-none text-xs",
              (type.value === "all" && !fileType) ||
                type.value === fileType
                ? "bg-muted"
                : ""
            )}
            onClick={() =>
              onFileTypeChange(
                type.value === "all" ? undefined : (type.value as AssetFileType)
              )
            }
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* AI Model filter */}
      {aiModels.length > 0 && (
        <Select
          value={selectedModelId || "all"}
          onValueChange={(v) =>
            onModelChange(
              v === "all" ? undefined : v === "__unassigned__" ? undefined : v
            )
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {aiModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Favorites toggle */}
      <Button
        variant={favoritesOnly ? "default" : "outline"}
        size="sm"
        onClick={onFavoritesToggle}
      >
        <Star
          className={cn(
            "h-4 w-4 mr-1",
            favoritesOnly && "fill-current"
          )}
        />
        Favorites
      </Button>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at-desc">Newest</SelectItem>
          <SelectItem value="created_at-asc">Oldest</SelectItem>
          <SelectItem value="file_size-desc">Largest</SelectItem>
          <SelectItem value="file_size-asc">Smallest</SelectItem>
          <SelectItem value="filename-asc">Name A-Z</SelectItem>
          <SelectItem value="filename-desc">Name Z-A</SelectItem>
        </SelectContent>
      </Select>

      {/* View mode */}
      <div className="flex rounded-md border border-border">
        <Button
          variant="ghost"
          size="sm"
          className={cn("rounded-none", viewMode === "grid" && "bg-muted")}
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("rounded-none", viewMode === "list" && "bg-muted")}
          onClick={() => onViewModeChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Selection mode toggle */}
      <Button
        variant={selectionMode ? "default" : "outline"}
        size="sm"
        onClick={onSelectionModeToggle}
      >
        <CheckSquare className="h-4 w-4 mr-1" />
        Select
      </Button>
    </div>
  );
}

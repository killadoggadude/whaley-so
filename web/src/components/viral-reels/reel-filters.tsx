import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, CheckSquare } from "lucide-react";
import { TagsFilter } from "./tags-filter";

interface ReelFiltersProps {
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
  selectionMode: boolean;
  onSelectionModeToggle: () => void;
  totalCount: number;
  minViews?: number;
  onMinViewsChange: (value: number | undefined) => void;
  maxViews?: number;
  onMaxViewsChange: (value: number | undefined) => void;
  selectedTags: string[];
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function ReelFilters({
  favoritesOnly,
  onFavoritesToggle,
  selectionMode,
  onSelectionModeToggle,
  totalCount,
  minViews,
  onMinViewsChange,
  maxViews,
  onMaxViewsChange,
  selectedTags,
  availableTags,
  onTagsChange,
}: ReelFiltersProps) {
  return (
    <div className="space-y-3">
      {/* First row: Favorites, Selection, Count */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Favorites toggle */}
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={onFavoritesToggle}
        >
          <Star
            className="h-4 w-4 mr-1"
            style={favoritesOnly ? { fill: "currentColor" } : undefined}
          />
          Favorites
        </Button>

        {/* Count */}
        <span className="text-xs text-muted-foreground">
          {totalCount} reel{totalCount !== 1 ? "s" : ""}
        </span>

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

      {/* Second row: View count range and Tags */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View count range */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min views"
            value={minViews || ""}
            onChange={(e) =>
              onMinViewsChange(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="w-28 h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max views"
            value={maxViews || ""}
            onChange={(e) =>
              onMaxViewsChange(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="w-28 h-8 text-xs"
          />
        </div>

        {/* Tags filter */}
        <TagsFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
        />
      </div>
    </div>
  );
}

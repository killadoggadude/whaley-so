"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TagsFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagsFilter({
  availableTags,
  selectedTags,
  onTagsChange,
}: TagsFilterProps) {
  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onTagsChange(newTags);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Tag className="h-4 w-4 mr-1" />
          Tags
          {selectedTags.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-4 px-1 text-[10px]"
            >
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableTags.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No tags yet
          </div>
        ) : (
          availableTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={selectedTags.includes(tag)}
              onCheckedChange={() => toggleTag(tag)}
            >
              {tag}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

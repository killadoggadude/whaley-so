"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import type { AssetWithUrl } from "@/types";

interface ReferenceImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onConfirm: (selected: AssetWithUrl[]) => void;
  maxImages?: number;
}

export function ReferenceImagePicker({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
  maxImages = 10,
}: ReferenceImagePickerProps) {
  const [images, setImages] = useState<AssetWithUrl[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, AssetWithUrl>>(new Map());
  const searchTimeout = useRef<NodeJS.Timeout>(undefined);

  // Initialize selection from parent
  useEffect(() => {
    if (open) {
      fetchImages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Pre-select images that are already chosen
  useEffect(() => {
    if (open && images.length > 0) {
      const initialSelection = new Map<string, AssetWithUrl>();
      for (const img of images) {
        if (selectedIds.includes(img.id)) {
          initialSelection.set(img.id, img);
        }
      }
      setSelected(initialSelection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, images.length]);

  const fetchImages = useCallback(
    async (append: boolean) => {
      setLoading(true);
      const offset = append ? images.length : 0;
      const result = await getAssetsAction({
        file_type: "image",
        search: search || undefined,
        sort_by: "created_at",
        sort_order: "desc",
        limit: 30,
        offset,
      });

      if (append) {
        setImages((prev) => [...prev, ...result.assets]);
      } else {
        setImages(result.assets);
      }
      setTotal(result.total);
      setLoading(false);
    },
    [search, images.length]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchImages(false);
    }, 300);
  };

  const toggleImage = (image: AssetWithUrl) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(image.id)) {
        next.delete(image.id);
      } else if (next.size < maxImages) {
        next.set(image.id, image);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected.values()));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Reference Images</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {images.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                No images found. Upload images in the Asset Library first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-2">
              {images.map((image) => {
                const isSelected = selected.has(image.id);
                const isMaxed = selected.size >= maxImages && !isSelected;
                return (
                  <button
                    key={image.id}
                    type="button"
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                      isSelected
                        ? "border-accent-blue ring-2 ring-accent-blue/20"
                        : "border-transparent hover:border-muted-foreground/30",
                      isMaxed && "opacity-40 cursor-not-allowed"
                    )}
                    onClick={() => !isMaxed && toggleImage(image)}
                    disabled={isMaxed}
                  >
                    <img
                      src={image.signed_url}
                      alt={image.filename}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent-blue/20 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-accent-blue flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {images.length < total && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchImages(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Badge variant="secondary">
            {selected.size} / {maxImages} selected
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm Selection</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  Check,
  ImageIcon,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import type { AssetWithUrl, AiModelWithImages } from "@/types";

interface StepImageSelectProps {
  selectedModel: AiModelWithImages | null;
  selectedImageId: string | null;
  onImageSelect: (id: string, signedUrl: string) => void;
}

export function StepImageSelect({
  selectedModel,
  selectedImageId,
  onImageSelect,
}: StepImageSelectProps) {
  const [images, setImages] = useState<AssetWithUrl[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelImages = selectedModel?.reference_images || [];
  const hasModelImages = modelImages.length > 0;

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

  useEffect(() => {
    if (showAll || !hasModelImages) {
      fetchImages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, hasModelImages]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => fetchImages(false), 300);
    return () => clearTimeout(timeout);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB size limit");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tags", JSON.stringify(["talking-head", "portrait"]));

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      toast.success("Image uploaded!");

      // Refresh the image list and auto-select the new image
      const result = await getAssetsAction({
        file_type: "image",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 30,
        offset: 0,
      });

      setImages(result.assets);
      setTotal(result.total);
      setShowAll(true);

      // Find and auto-select the uploaded asset
      const uploaded = result.assets.find(
        (a) => a.id === data.asset.id
      );
      if (uploaded) {
        onImageSelect(uploaded.id, uploaded.signed_url);
      }
    } catch {
      setUploadError("Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayImages = !showAll && hasModelImages ? modelImages : images;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Select Portrait Image</h2>
        <p className="text-sm text-muted-foreground">
          Choose a portrait image for the talking head video. A clear
          front-facing photo works best.
        </p>
      </div>

      {/* Upload + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasModelImages && (
          <>
            <Button
              variant={!showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll(false)}
            >
              {selectedModel?.name}&apos;s Images ({modelImages.length})
            </Button>
            <Button
              variant={showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll(true)}
            >
              All Images
            </Button>
          </>
        )}

        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      </div>

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Search (only for all images) */}
      {(showAll || !hasModelImages) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Image grid */}
      {displayImages.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">
            No images found. Upload an image above or add images in the{" "}
            <a href="/dashboard/assets" className="underline font-medium">
              Asset Library
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {displayImages.map((image) => {
            const isSelected = selectedImageId === image.id;
            return (
              <button
                key={image.id}
                type="button"
                className={cn(
                  "relative aspect-square overflow-hidden rounded-md border-2 transition-all",
                  isSelected
                    ? "border-accent-blue ring-2 ring-accent-blue/20"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => onImageSelect(image.id, image.signed_url)}
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

      {/* Load more (only for all images) */}
      {(showAll || !hasModelImages) && images.length < total && (
        <div className="flex justify-center">
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

      {selectedImageId && (
        <div className="flex items-center gap-2 justify-center">
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Image selected
          </Badge>
          <p className="text-xs text-muted-foreground">
            Use the Next button to continue.
          </p>
        </div>
      )}
    </div>
  );
}

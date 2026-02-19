"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Download,
  Trash2,
  Plus,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { updateTagsAction } from "@/app/dashboard/assets/actions";
import type { AssetWithUrl } from "@/types";

interface AssetDetailDialogProps {
  asset: AssetWithUrl | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  aiModels?: { id: string; name: string }[];
}

export function AssetDetailDialog({
  asset,
  open,
  onOpenChange,
  onFavorite,
  onDelete,
  aiModels,
}: AssetDetailDialogProps) {
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagsDirty, setTagsDirty] = useState(false);

  // Sync tags when asset changes
  if (asset && !tagsDirty && JSON.stringify(tags) !== JSON.stringify(asset.tags)) {
    setTags(asset.tags);
  }

  if (!asset) return null;

  const modelName = asset.ai_model_id && aiModels
    ? aiModels.find((m) => m.id === asset.ai_model_id)?.name
    : undefined;

  const addTag = async () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim().toLowerCase()];
    setTags(updated);
    setTagsDirty(true);
    setNewTag("");
    const result = await updateTagsAction(asset.id, updated);
    if (!result.success) toast.error(result.error);
    setTagsDirty(false);
  };

  const removeTag = async (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    setTagsDirty(true);
    const result = await updateTagsAction(asset.id, updated);
    if (!result.success) toast.error(result.error);
    setTagsDirty(false);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = asset.signed_url;
    a.download = asset.filename;
    a.click();
  };

  const renderPreview = () => {
    switch (asset.file_type) {
      case "image":
        return (
          <img
            src={asset.signed_url}
            alt={asset.filename}
            className="max-h-[400px] w-full object-contain rounded-md bg-muted"
          />
        );
      case "audio":
        return (
          <div className="flex items-center justify-center p-8 bg-muted rounded-md">
            <audio controls src={asset.signed_url} className="w-full" />
          </div>
        );
      case "video":
        return (
          <video
            controls
            src={asset.signed_url}
            className="max-h-[400px] w-full rounded-md bg-muted"
          />
        );
      case "document":
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-md">
            <FileText className="h-16 w-16 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{asset.filename}</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setTagsDirty(false); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">{asset.filename}</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        {renderPreview()}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFavorite(asset.id)}
          >
            <Star
              className={cn(
                "h-4 w-4 mr-1",
                asset.is_favorite && "fill-yellow-400 text-yellow-400"
              )}
            />
            {asset.is_favorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onDelete(asset.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <Separator />

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>{" "}
            {asset.file_type}
          </div>
          <div>
            <span className="text-muted-foreground">MIME:</span>{" "}
            {asset.mime_type}
          </div>
          <div>
            <span className="text-muted-foreground">Size:</span>{" "}
            {formatFileSize(asset.file_size)}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>{" "}
            {formatDate(asset.created_at)}
          </div>
          {modelName && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Model:</span>{" "}
              <Badge variant="secondary" className="text-xs">
                {modelName}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <div className="flex gap-1">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="h-7 w-32 text-xs"
              />
              <Button size="sm" variant="ghost" className="h-7" onClick={addTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

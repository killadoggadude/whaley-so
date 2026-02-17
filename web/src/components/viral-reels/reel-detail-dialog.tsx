"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Video, Save, Loader2, ExternalLink, Play } from "lucide-react";
import { toast } from "sonner";
import { updateViralReelAction } from "@/app/dashboard/viral-reels/actions";
import { getThumbnailProxyUrl } from "@/lib/thumbnail";
import type { ViralReel } from "@/types";

interface ReelDetailDialogProps {
  reel: ViralReel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onRecreate: (reel: ViralReel) => void;
}

export function ReelDetailDialog({
  reel,
  open,
  onOpenChange,
  onUpdated,
  onRecreate,
}: ReelDetailDialogProps) {
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [viewCountInput, setViewCountInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reel) {
      setNotes(reel.notes || "");
      setTagsInput(reel.tags.join(", "));
      setViewCountInput(reel.view_count > 0 ? reel.view_count.toString() : "");
    }
  }, [reel]);

  if (!reel) return null;

  const thumbnailUrl = reel.thumbnail_url
    ? `/api/viral-reels/stored-thumbnail?path=${encodeURIComponent(reel.thumbnail_url)}`
    : getThumbnailProxyUrl(reel.url, reel.platform, reel.shortcode);

  const handleSave = async () => {
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await updateViralReelAction(reel.id, { notes, tags });
    if (result.success) {
      toast.success("Reel updated");
      onUpdated();
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  };

  const hasChanges =
    notes !== (reel.notes || "") || tagsInput !== reel.tags.join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Reel
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </DialogTitle>
        </DialogHeader>

        {/* Thumbnail preview with link to Instagram */}
        <a
          href={reel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/thumb block relative rounded-lg overflow-hidden bg-muted aspect-[9/16] max-h-[400px]"
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Reel thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumb:bg-black/30 transition-colors">
            <div className="rounded-full bg-white/90 p-3 opacity-0 group-hover/thumb:opacity-100 transition-opacity shadow-lg">
              <Play className="h-6 w-6 text-black fill-black" />
            </div>
          </div>
        </a>

        {/* Platform badge */}
        <Badge variant="outline" className="w-fit capitalize">
          {reel.platform}
        </Badge>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Add notes about this reel..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tags</label>
          <Input
            placeholder="Comma-separated (e.g., hook, sexy, transition)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* View Count */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">View Count</label>
          <Input
            type="number"
            placeholder="e.g., 150000 or 500000"
            value={viewCountInput}
            onChange={(e) => setViewCountInput(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onRecreate(reel);
            }}
          >
            <Video className="h-4 w-4 mr-1" />
            Recreate
          </Button>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

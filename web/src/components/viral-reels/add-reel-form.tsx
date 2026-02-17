"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addViralReelAction } from "@/app/dashboard/viral-reels/actions";
import type { ViralReel } from "@/types";

interface AddReelFormProps {
  onReelAdded: (reel: ViralReel) => void;
}

export function AddReelForm({ onReelAdded }: AddReelFormProps) {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [contentType, setContentType] = useState<string>("");
  const [viewCountRange, setViewCountRange] = useState<string>("");
  const [showExtras, setShowExtras] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast.error("Please paste an Instagram reel URL");
      return;
    }

    // Validate required fields
    if (!contentType) {
      toast.error("Please select a content type (Talking Head, Dancing, or Motion)");
      return;
    }
    if (!viewCountRange) {
      toast.error("Please select a view count range");
      return;
    }

    setLoading(true);

    // Convert view count range to actual number
    const rangeToCount: Record<string, number> = {
      "100k+": 100000,
      "500k+": 500000,
      "1m+": 1000000,
    };
    const viewCount = rangeToCount[viewCountRange];

    const result = await addViralReelAction({
      url: url.trim(),
      notes: notes.trim() || undefined,
      tags: [contentType], // Only use the selected content type tag
      viewCount: viewCount,
    });

    if (result.error) {
      toast.error(result.error);
    } else if (result.reel) {
      toast.success("Reel saved!");
      onReelAdded(result.reel);
      setUrl("");
      setNotes("");
      setContentType("");
      setViewCountRange("");
      setShowExtras(false);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg bg-card border border-border p-4 space-y-3 transition-colors duration-200 hover:bg-card-hover">
      <div className="flex gap-2">
        <Input
          placeholder="Paste Instagram reel URL (e.g., instagram.com/reel/...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) handleSubmit();
          }}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add Reel
        </Button>
      </div>

      {/* Toggle extras */}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowExtras(!showExtras)}
      >
        {showExtras ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Add notes & tags
      </button>

      {/* Extra fields */}
      {showExtras && (
        <div className="space-y-3">
          <Textarea
            placeholder="Notes (e.g., great hook, trending topic...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              Content Type *
            </label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="talking_head">Talking Head</SelectItem>
                <SelectItem value="dancing">Dancing</SelectItem>
                <SelectItem value="motion">Motion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">
              View Count *
            </label>
            <Select value={viewCountRange} onValueChange={setViewCountRange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select view count range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100k+">100K+</SelectItem>
                <SelectItem value="500k+">500K+</SelectItem>
                <SelectItem value="1m+">1M+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

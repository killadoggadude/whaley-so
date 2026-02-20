"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Music,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Upload,
  Search,
  ImageIcon,
  Download,
  Save,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import { createClient } from "@/lib/supabase/client";
import type { AiModelWithImages, AssetWithUrl } from "@/types";

interface SingleDancingReelProps {
  aiModels: AiModelWithImages[];
}

const DEFAULT_PROMPT =
  "natural, energetic and realistic sexy dance moves, she is dancing sexy to a tiktok trend music and moving her hips and arms as if she is dancing to a trending song for a tiktok dance video, not talking, no slow motion";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 200; // ~16 minutes

type GenerationState =
  | "idle"
  | "submitting"
  | "polling"
  | "completed"
  | "failed";

export function SingleDancingReel({ aiModels }: SingleDancingReelProps) {
  // Image selection
  const [images, setImages] = useState<AssetWithUrl[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  // Prompt & settings
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [duration, setDuration] = useState<5 | 10>(5);

  // Generation state
  const [state, setState] = useState<GenerationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pollingRef = useRef(false);

  const selectedModel = aiModels.find((m) => m.id === selectedModelId) || null;
  const modelImages = selectedModel?.reference_images || [];
  const hasModelImages = modelImages.length > 0;

  // Fetch all images from asset library
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
    fetchImages(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeout = setTimeout(() => fetchImages(false), 300);
    return () => clearTimeout(timeout);
  };

  const handleImageSelect = (id: string, signedUrl: string) => {
    setSelectedImageId(id);
    setSelectedImageUrl(signedUrl);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB size limit");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const uuid = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/image/${uuid}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: asset, error: dbError } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          filename: file.name,
          file_path: filePath,
          file_type: "image",
          mime_type: file.type,
          file_size: file.size,
          tags: ["dancing-reel", "portrait"],
          metadata: {},
        })
        .select("id")
        .single();

      if (dbError) {
        await supabase.storage.from("assets").remove([filePath]);
        toast.error(`Database error: ${dbError.message}`);
        return;
      }

      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(filePath, 3600);

      if (urlData?.signedUrl) {
        setSelectedImageId(asset.id);
        setSelectedImageUrl(urlData.signedUrl);
        toast.success("Image uploaded!");
        // Refresh images list
        fetchImages(false);
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  const startPolling = useCallback(
    async (taskId: string) => {
      pollingRef.current = true;
      let attempts = 0;
      let consecutiveErrors = 0;

      while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        setPollCount(attempts);

        try {
          const res = await fetch(
            `/api/talking-head/status?taskId=${encodeURIComponent(taskId)}`
          );
          const data = await res.json();

          if (data.status === "completed" && data.videoUrl) {
            pollingRef.current = false;
            setVideoUrl(data.videoUrl);
            setState("completed");
            toast.success("Dancing reel generated!");
            return;
          }

          if (data.status === "failed") {
            pollingRef.current = false;
            setState("failed");
            setError(data.error || "Video generation failed");
            return;
          }

          consecutiveErrors = 0;
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            pollingRef.current = false;
            setState("failed");
            setError("Network error after multiple retries");
            return;
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      }

      if (pollingRef.current) {
        pollingRef.current = false;
        setState("failed");
        setError(`Timed out after ${attempts} polls (~${Math.round(attempts * POLL_INTERVAL_MS / 1000)}s)`);
      }
    },
    []
  );

  const handleGenerate = async () => {
    if (!selectedImageUrl) {
      toast.error("Select an image first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }

    setState("submitting");
    setError(null);
    setPollCount(0);
    setVideoUrl(null);
    setSavedAssetId(null);

    try {
      const res = await fetch("/api/dancing-reel/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: selectedImageUrl,
          prompt: prompt.trim(),
          duration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("failed");
        setError(data.error || "Failed to submit dancing reel generation");
        return;
      }

      setState("polling");
      toast.info("Dancing reel generation started...");
      startPolling(data.taskId);
    } catch {
      setState("failed");
      setError("Failed to submit dancing reel generation");
    }
  };

  const handleSave = async () => {
    if (!videoUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dancing-reel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedAssetId(data.assetId);
        toast.success("Video saved to library!");
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setState("idle");
    setError(null);
    setPollCount(0);
    setVideoUrl(null);
    setSavedAssetId(null);
    pollingRef.current = false;
  };

  const displayImages = !showAll && hasModelImages ? modelImages : images;
  const isProcessing = state === "submitting" || state === "polling";
  const elapsedSeconds = pollCount * (POLL_INTERVAL_MS / 1000);
  const progressPercent = Math.min((pollCount / MAX_POLL_ATTEMPTS) * 100, 95);

  const estimatedCost = duration === 5 ? 0.35 : 0.70;

  return (
    <div className="space-y-6">
      {/* Step 1: Select Image */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">Select Image</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose a portrait image (ideally 9:16 aspect ratio) to animate into a dancing video.
            </p>
          </div>
        </div>

        {/* Model filter + Upload row */}
        <div className="flex items-center gap-2 flex-wrap">
          {aiModels.length > 0 && (
            <select
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                setShowAll(!e.target.value);
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Images</option>
              {aiModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.reference_images.length})
                </option>
              ))}
            </select>
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
              disabled={uploading || isProcessing}
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

        {/* Search */}
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
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              No images found. Upload an image above or add images in the{" "}
              <a href="/dashboard/assets" className="underline font-medium">
                Asset Library
              </a>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {displayImages.map((image) => {
              const isSelected = selectedImageId === image.id;
              return (
                <button
                  key={image.id}
                  type="button"
                  disabled={isProcessing}
                  className={cn(
                    "relative aspect-[9/16] overflow-hidden rounded-md border-2 transition-all",
                    isSelected
                      ? "border-accent-blue ring-2 ring-accent-blue/20"
                      : "border-transparent hover:border-muted-foreground/30",
                    isProcessing && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleImageSelect(image.id, image.signed_url)}
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
        {(showAll || !hasModelImages) && images.length < total && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchImages(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
            </Button>
          </div>
        )}

        {selectedImageId && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Image selected
            </Badge>
          </div>
        )}
      </div>

      {/* Step 2: Prompt & Settings */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">Prompt & Settings</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize the dance prompt and choose video duration. The default prompt works well for most cases.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Dance Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the dancing motion..."
              rows={4}
              className="resize-y text-sm"
              disabled={isProcessing}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {prompt.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              {prompt !== DEFAULT_PROMPT && (
                <button
                  type="button"
                  onClick={() => setPrompt(DEFAULT_PROMPT)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isProcessing}
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2">
              <Button
                variant={duration === 5 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(5)}
                disabled={isProcessing}
                className="flex-1"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                5 seconds (~$0.35)
              </Button>
              <Button
                variant={duration === 10 ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(10)}
                disabled={isProcessing}
                className="flex-1"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                10 seconds (~$0.70)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Generate */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            3
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">Generate</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate the dancing reel video. This typically takes 2-5 minutes.
            </p>
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
              <span className="text-sm font-medium">
                {state === "submitting" && "Submitting to Kling 2.6 Pro..."}
                {state === "polling" && "Generating dancing video..."}
              </span>
              {state === "polling" && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(elapsedSeconds)}s elapsed
                </span>
              )}
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {state === "polling" && pollCount < 20 &&
                "Processing your video. This usually takes 2-5 minutes..."}
              {state === "polling" && pollCount >= 20 && pollCount < 60 &&
                "Still processing. Kling 2.6 Pro generates high-quality output..."}
              {state === "polling" && pollCount >= 60 &&
                "Almost there. Please wait..."}
            </p>
          </div>
        )}

        {/* Completed */}
        {state === "completed" && videoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Dancing reel generated!</span>
            </div>
            <video
              controls
              src={videoUrl}
              className="w-full max-h-[400px] rounded-md bg-black"
              preload="metadata"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = videoUrl;
                  a.download = `dancing-reel-${duration}s.mp4`;
                  a.target = "_blank";
                  a.click();
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
              {savedAssetId ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </Badge>
              ) : (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  {saving ? "Saving..." : "Save to Library"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                New Video
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate button */}
        {state === "idle" && (
          <Button
            onClick={handleGenerate}
            className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
            size="lg"
            disabled={!selectedImageId || !prompt.trim()}
          >
            <Music className="h-4 w-4 mr-2" />
            Generate Dancing Reel ({duration}s) — Est. ${estimatedCost.toFixed(2)}
          </Button>
        )}

        {state === "failed" && (
          <Button onClick={handleReset} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Powered by WaveSpeed Kling 2.6 Pro Image-to-Video. Sound is disabled (add music in post).
        </p>
      </div>
    </div>
  );
}

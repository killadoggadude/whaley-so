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
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Upload,
  Download,
  Save,
  Check,
  Link2,
  ImageIcon,
  Play,
  Clapperboard,
  ArrowRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AiModelWithImages } from "@/types";

interface MotionControlWorkflowProps {
  aiModels: AiModelWithImages[];
}

/** Check if a URL is a social media page URL (not a direct video file) */
function isSocialUrl(url: string): boolean {
  return (
    url.includes("instagram.com") ||
    url.includes("instagr.am") ||
    url.includes("tiktok.com")
  );
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 200;

type PipelineStep =
  | "input"          // Step 1: Provide video + select AI model
  | "extracting"     // Extracting first frame
  | "extracted"      // Frame extracted, ready to recreate
  | "recreating"     // Recreating image with AI model identity
  | "recreated"      // Image recreated, ready to generate
  | "generating"     // Generating motion control video
  | "completed"      // Video generated
  | "failed";        // Any step failed

export function MotionControlWorkflow({
  aiModels,
}: MotionControlWorkflowProps) {
  // Step 1: Video input
  const [videoSource, setVideoSource] = useState<"url" | "upload">("url");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Step 1: AI Model selection
  const [selectedModelId, setSelectedModelId] = useState<string>(
    aiModels.length === 1 ? aiModels[0].id : ""
  );

  // Step 2: Extracted frame
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  // The resolved direct video URL (from Instagram/TikTok resolution or Supabase upload)
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);

  // Step 3: Recreated image
  const [recreatedImageUrl, setRecreatedImageUrl] = useState<string | null>(null);
  const [recreatePrompt, setRecreatePrompt] = useState("");

  // Step 4: Motion control settings
  const [motionPrompt, setMotionPrompt] = useState("");
  const [characterOrientation, setCharacterOrientation] = useState<"image" | "video">("image");

  // Pipeline state
  const [step, setStep] = useState<PipelineStep>("input");
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [savedAssetId, setSavedAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pollingRef = useRef(false);

  const selectedModel = aiModels.find((m) => m.id === selectedModelId) || null;
  const modelImages = selectedModel?.reference_images || [];

  // The input video URL — either from URL input or upload
  const inputVideoUrl =
    videoSource === "url" ? videoUrl.trim() : uploadedVideoUrl;
  const hasVideoInput = !!inputVideoUrl;
  // For motion control step, use the resolved/stable video URL (direct .mp4)
  const effectiveVideoUrl = resolvedVideoUrl || inputVideoUrl;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  // ── Video upload handler ──────────────────────────────────────────

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File exceeds 100MB size limit");
      return;
    }

    setVideoUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const uuid = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/video/${uuid}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(filePath, 3600);

      if (urlData?.signedUrl) {
        setUploadedVideoUrl(urlData.signedUrl);
        toast.success("Video uploaded!");
      }
    } catch {
      toast.error("Failed to upload video");
    } finally {
      setVideoUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  // ── Step 2: Extract first frame ───────────────────────────────────

  const handleExtractFrame = async () => {
    if (!inputVideoUrl) {
      toast.error("Please provide a video first");
      return;
    }
    if (!selectedModelId) {
      toast.error("Please select an AI model");
      return;
    }

    setStep("extracting");
    setError(null);
    setFrameUrl(null);
    setResolvedVideoUrl(null);
    setRecreatedImageUrl(null);
    setResultVideoUrl(null);
    setSavedAssetId(null);

    try {
      const res = await fetch("/api/motion-control/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: inputVideoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStep("failed");
        setError(data.error || "Failed to extract frame");
        return;
      }

      setFrameUrl(data.frameUrl);
      // Store the resolved video URL (direct .mp4 from Supabase or CDN)
      // This is needed because Instagram/TikTok page URLs don't work as direct video inputs
      if (data.resolvedVideoUrl) {
        setResolvedVideoUrl(data.resolvedVideoUrl);
      }
      setStep("extracted");
      toast.success("First frame extracted!");
    } catch {
      setStep("failed");
      setError("Failed to extract frame from video");
    }
  };

  // ── Step 3: Recreate image with AI model identity ─────────────────

  const pollRecreateImage = useCallback(async (taskId: string) => {
    pollingRef.current = true;
    let attempts = 0;
    let consecutiveErrors = 0;

    while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
      attempts++;
      setPollCount(attempts);

      try {
        const res = await fetch(
          `/api/motion-control/recreate-status?taskId=${encodeURIComponent(taskId)}`
        );
        const data = await res.json();

        if (data.status === "completed" && data.imageUrl) {
          pollingRef.current = false;
          setRecreatedImageUrl(data.imageUrl);
          setStep("recreated");
          toast.success("Image recreated with your AI model!");
          return;
        }

        if (data.status === "failed") {
          pollingRef.current = false;
          setStep("failed");
          setError(data.error || "Image recreation failed");
          return;
        }

        consecutiveErrors = 0;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          pollingRef.current = false;
          setStep("failed");
          setError("Network error after multiple retries");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    if (pollingRef.current) {
      pollingRef.current = false;
      setStep("failed");
      setError(`Timed out after ${attempts} polls`);
    }
  }, []);

  const handleRecreateImage = async () => {
    if (!frameUrl || !selectedModel || modelImages.length === 0) {
      toast.error("Missing frame or model reference images");
      return;
    }

    setStep("recreating");
    setError(null);
    setPollCount(0);
    setRecreatedImageUrl(null);
    setResultVideoUrl(null);

    try {
      // Pick 2 face images + 1 body image from reference images
      // Face images go first (identity source), body image last (body type reference)
      const faceImages = modelImages.filter((img) =>
        img.filename.toLowerCase().includes("face")
      );
      const bodyImages = modelImages.filter((img) =>
        img.filename.toLowerCase().includes("body")
      );
      const otherImages = modelImages.filter(
        (img) =>
          !img.filename.toLowerCase().includes("face") &&
          !img.filename.toLowerCase().includes("body")
      );

      const selected: typeof modelImages = [];
      // Slot 1 & 2: face images
      if (faceImages.length >= 2) {
        selected.push(faceImages[0], faceImages[1]);
      } else if (faceImages.length === 1) {
        selected.push(faceImages[0]);
        // Fill second slot from body or other
        if (bodyImages.length > 0) selected.push(bodyImages[0]);
        else if (otherImages.length > 0) selected.push(otherImages[0]);
      } else {
        // No face images — use whatever is available
        selected.push(...modelImages.slice(0, 2));
      }
      // Slot 3: body image
      if (selected.length < 3) {
        const usedIds = new Set(selected.map((img) => img.id));
        const unusedBody = bodyImages.find((img) => !usedIds.has(img.id));
        if (unusedBody) {
          selected.push(unusedBody);
        } else {
          // No unused body image — fill from any unused image
          const fallback = modelImages.find((img) => !usedIds.has(img.id));
          if (fallback) selected.push(fallback);
        }
      }

      const referenceImageUrls = selected.map((img) => img.signed_url);

      const res = await fetch("/api/motion-control/recreate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImageUrls,
          frameUrl,
          prompt: recreatePrompt.trim() || undefined,
          aspectRatio: "9:16",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStep("failed");
        setError(data.error || "Failed to submit image recreation");
        return;
      }

      toast.info("Recreating image with AI model identity...");
      pollRecreateImage(data.taskId);
    } catch {
      setStep("failed");
      setError("Failed to submit image recreation");
    }
  };

  // ── Step 4: Generate motion control video ─────────────────────────

  const pollMotionControl = useCallback(async (taskId: string) => {
    pollingRef.current = true;
    let attempts = 0;
    let consecutiveErrors = 0;

    while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
      attempts++;
      setPollCount(attempts);

      try {
        // Reuse the generic WaveSpeed polling route
        const res = await fetch(
          `/api/talking-head/status?taskId=${encodeURIComponent(taskId)}`
        );
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          pollingRef.current = false;
          setResultVideoUrl(data.videoUrl);
          setStep("completed");
          toast.success("Motion control video generated!");
          return;
        }

        if (data.status === "failed") {
          pollingRef.current = false;
          setStep("failed");
          setError(data.error || "Video generation failed");
          return;
        }

        consecutiveErrors = 0;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          pollingRef.current = false;
          setStep("failed");
          setError("Network error after multiple retries");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    if (pollingRef.current) {
      pollingRef.current = false;
      setStep("failed");
      setError(`Timed out after ${attempts} polls`);
    }
  }, []);

  const handleGenerateVideo = async () => {
    if (!recreatedImageUrl || !effectiveVideoUrl) {
      toast.error("Missing recreated image or reference video");
      return;
    }

    setStep("generating");
    setError(null);
    setPollCount(0);
    setResultVideoUrl(null);
    setSavedAssetId(null);

    try {
      const res = await fetch("/api/motion-control/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: recreatedImageUrl,
          videoUrl: effectiveVideoUrl,
          prompt: motionPrompt.trim() || undefined,
          characterOrientation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStep("failed");
        setError(data.error || "Failed to submit motion control generation");
        return;
      }

      toast.info("Generating motion control video...");
      pollMotionControl(data.taskId);
    } catch {
      setStep("failed");
      setError("Failed to submit motion control generation");
    }
  };

  // ── Save to library ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!resultVideoUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/motion-control/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: resultVideoUrl }),
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

  // ── Reset ─────────────────────────────────────────────────────────

  const handleReset = () => {
    pollingRef.current = false;
    setStep("input");
    setError(null);
    setPollCount(0);
    setFrameUrl(null);
    setResolvedVideoUrl(null);
    setRecreatedImageUrl(null);
    setResultVideoUrl(null);
    setSavedAssetId(null);
    setVideoUrl("");
    setUploadedVideoUrl(null);
    setRecreatePrompt("");
    setMotionPrompt("");
  };

  const handleRetry = () => {
    pollingRef.current = false;
    // Go back to the last successful step
    if (recreatedImageUrl) {
      setStep("recreated");
    } else if (frameUrl) {
      setStep("extracted");
    } else {
      setStep("input");
    }
    setError(null);
    setPollCount(0);
  };

  // ── Derived state ─────────────────────────────────────────────────

  const isProcessing =
    step === "extracting" ||
    step === "recreating" ||
    step === "generating";

  const elapsedSeconds = pollCount * (POLL_INTERVAL_MS / 1000);
  const progressPercent = Math.min((pollCount / MAX_POLL_ATTEMPTS) * 100, 95);

  const stepNumber = (s: PipelineStep): number => {
    switch (s) {
      case "input":
        return 1;
      case "extracting":
      case "extracted":
        return 2;
      case "recreating":
      case "recreated":
        return 3;
      case "generating":
      case "completed":
        return 4;
      case "failed":
        return 0;
    }
  };

  const currentStep = stepNumber(step);

  return (
    <div className="space-y-6">
      {/* Pipeline Progress Indicator */}
      <div className="flex items-center gap-2 px-1">
        {[
          { num: 1, label: "Video Input" },
          { num: 2, label: "Extract Frame" },
          { num: 3, label: "Recreate Image" },
          { num: 4, label: "Generate Video" },
        ].map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  currentStep > num
                    ? "bg-green-500 text-white"
                    : currentStep === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > num ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  num
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  currentStep >= num
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < 3 && (
              <ArrowRight
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0",
                  currentStep > num
                    ? "text-green-500"
                    : "text-muted-foreground/40"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Video Input + Model Selection ────────────────── */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
              currentStep > 1
                ? "bg-green-500 text-white"
                : "bg-primary text-primary-foreground"
            )}
          >
            {currentStep > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">
              Reference Video & AI Model
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Provide a reference video (the motions to copy) and select the AI
              model whose identity will be used.
            </p>
          </div>
        </div>

        {/* Video source toggle */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={videoSource === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setVideoSource("url")}
              disabled={isProcessing}
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Paste URL
            </Button>
            <Button
              variant={videoSource === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => setVideoSource("upload")}
              disabled={isProcessing}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload Video
            </Button>
          </div>

          {videoSource === "url" ? (
            <div className="space-y-1.5">
              <Label>Video URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://... (direct video URL, Instagram reel, TikTok, etc.)"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Paste a direct video URL. For Instagram/TikTok, you may need to
                use a direct download link.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Upload Video</Label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoUploading || isProcessing}
                >
                  {videoUploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  {videoUploading ? "Uploading..." : "Choose Video"}
                </Button>
                {uploadedVideoUrl && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Video uploaded
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max 100MB. MP4 recommended. 3-30 seconds.
              </p>
            </div>
          )}
        </div>

        {/* Video preview — show resolved URL if available (direct .mp4), otherwise input URL */}
        {(resolvedVideoUrl || (inputVideoUrl && !isSocialUrl(inputVideoUrl))) && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Reference Video Preview
            </Label>
            <video
              controls
              src={resolvedVideoUrl || inputVideoUrl || ""}
              className="w-full max-h-[250px] rounded-md bg-black"
              preload="metadata"
            />
          </div>
        )}

        {/* AI Model selection */}
        <div className="space-y-1.5">
          <Label>AI Model</Label>
          {aiModels.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active AI models found. Create one in the{" "}
                <a
                  href="/dashboard/models"
                  className="underline font-medium"
                >
                  AI Models
                </a>{" "}
                section first.
              </AlertDescription>
            </Alert>
          ) : (
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={isProcessing}
            >
              <option value="">Select an AI model...</option>
              {aiModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.reference_images.length} reference images)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Model reference images preview */}
        {selectedModel && modelImages.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Reference Images ({modelImages.length})
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {modelImages.map((img) => (
                <img
                  key={img.id}
                  src={img.signed_url}
                  alt={img.filename}
                  className="h-20 w-14 object-cover rounded-md border border-border flex-shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Selected model warning if no reference images */}
        {selectedModel && modelImages.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This model has no reference images. Add reference images in the{" "}
              <a
                href="/dashboard/models"
                className="underline font-medium"
              >
                AI Models
              </a>{" "}
              section.
            </AlertDescription>
          </Alert>
        )}

        {/* Start pipeline button */}
        {step === "input" && (
          <Button
            onClick={handleExtractFrame}
            className="w-full"
            size="lg"
            disabled={
              !hasVideoInput ||
              !selectedModelId ||
              modelImages.length === 0
            }
          >
            <Play className="h-4 w-4 mr-2" />
            Start Pipeline — Extract First Frame
          </Button>
        )}
      </div>

      {/* ── Step 2: Frame Extraction ─────────────────────────────── */}
      {(currentStep >= 2 || step === "extracting") && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                currentStep > 2
                  ? "bg-green-500 text-white"
                  : currentStep === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > 2 ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold">
                Extract First Frame
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                The first frame of the reference video is extracted to use as
                the base for identity recreation.
              </p>
            </div>
          </div>

          {step === "extracting" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
              <span className="text-sm font-medium">
                Extracting first frame...
              </span>
            </div>
          )}

          {frameUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  First frame extracted
                </span>
              </div>
              <img
                src={frameUrl}
                alt="Extracted first frame"
                className="max-h-[300px] rounded-md border border-border"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Recreate Image ───────────────────────────────── */}
      {(currentStep >= 3 || step === "extracted") && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                currentStep > 3
                  ? "bg-green-500 text-white"
                  : currentStep === 3
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > 3 ? <Check className="h-4 w-4" /> : "3"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold">
                Recreate Image with AI Model
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                The extracted frame is recreated using your AI model&apos;s
                identity via Nano Banana Pro Edit. Same pose, outfit, and
                background — different person.
              </p>
            </div>
          </div>

          {/* Custom prompt override (optional) */}
          {step === "extracted" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>
                  Recreation Prompt{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional override)
                  </span>
                </Label>
                <Textarea
                  value={recreatePrompt}
                  onChange={(e) => setRecreatePrompt(e.target.value)}
                  placeholder="Leave empty to use the default identity-swap prompt. Override if you need specific adjustments."
                  rows={3}
                  className="resize-y text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Default prompt swaps the person&apos;s identity while keeping
                  pose, outfit, background, and expression.
                </p>
              </div>

              <Button
                onClick={handleRecreateImage}
                className="w-full"
                size="lg"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Recreate Image with {selectedModel?.name || "AI Model"} — Est.
                $0.14
              </Button>
            </div>
          )}

          {step === "recreating" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
                <span className="text-sm font-medium">
                  Recreating image with AI model identity...
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(elapsedSeconds)}s elapsed
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {pollCount < 12 &&
                  "Processing with Nano Banana Pro Edit. Usually takes 30-60 seconds..."}
                {pollCount >= 12 &&
                  pollCount < 30 &&
                  "Still generating. This can take up to 2 minutes..."}
                {pollCount >= 30 && "Almost there. Please wait..."}
              </p>
            </div>
          )}

          {recreatedImageUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  Image recreated successfully
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Original Frame
                  </Label>
                  <img
                    src={frameUrl!}
                    alt="Original frame"
                    className="w-full rounded-md border border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Recreated with {selectedModel?.name}
                  </Label>
                  <img
                    src={recreatedImageUrl}
                    alt="Recreated frame"
                    className="w-full rounded-md border border-border"
                  />
                </div>
              </div>

              {/* Retry recreation */}
              {step === "recreated" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Not happy with the result? Adjust the prompt and try again.
                  </p>
                  <div className="space-y-1.5">
                    <Label>
                      Recreation Prompt{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional override)
                      </span>
                    </Label>
                    <Textarea
                      value={recreatePrompt}
                      onChange={(e) => setRecreatePrompt(e.target.value)}
                      placeholder="Leave empty to use the default identity-swap prompt. Override if you need specific adjustments."
                      rows={3}
                      className="resize-y text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRecreateImage}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Image Recreation — Est. $0.14
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Generate Motion Control Video ────────────────── */}
      {(currentStep >= 4 || step === "recreated") && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                step === "completed"
                  ? "bg-green-500 text-white"
                  : currentStep === 4
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {step === "completed" ? (
                <Check className="h-4 w-4" />
              ) : (
                "4"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold">
                Generate Motion Control Video
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                The recreated image and original video are combined using Kling
                2.6 Pro Motion Control to generate the final video.
              </p>
            </div>
          </div>

          {step === "recreated" && (
            <div className="space-y-3">
              {/* Motion prompt (optional) */}
              <div className="space-y-1.5">
                <Label>
                  Refinement Prompt{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  placeholder="Optional: refine scene details (e.g., 'soft lighting, cinematic feel')"
                  rows={2}
                  className="resize-y text-sm"
                />
              </div>

              {/* Character orientation */}
              <div className="space-y-1.5">
                <Label>Character Orientation</Label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      characterOrientation === "image"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setCharacterOrientation("image")}
                    className="flex-1"
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                    From Image (Recommended)
                  </Button>
                  <Button
                    variant={
                      characterOrientation === "video"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => setCharacterOrientation("video")}
                    className="flex-1"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    From Video
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  &quot;From Image&quot; uses the recreated image to determine
                  the character framing. &quot;From Video&quot; uses the
                  original video framing.
                </p>
              </div>

              <Button
                onClick={handleGenerateVideo}
                className="w-full"
                size="lg"
              >
                <Clapperboard className="h-4 w-4 mr-2" />
                Generate Motion Control Video — Est. $0.56-$3.36
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Cost depends on video duration: 5s=$0.56, 10s=$1.12,
                15s=$1.68, 30s=$3.36
              </p>
            </div>
          )}

          {step === "generating" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
                <span className="text-sm font-medium">
                  Generating motion control video...
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(elapsedSeconds)}s elapsed
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {pollCount < 20 &&
                  "Processing with Kling 2.6 Pro Motion Control. This usually takes 3-8 minutes..."}
                {pollCount >= 20 &&
                  pollCount < 60 &&
                  "Still generating. Kling 2.6 Pro produces high-quality output..."}
                {pollCount >= 60 && "Almost there. Please wait..."}
              </p>
            </div>
          )}

          {step === "completed" && resultVideoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  Motion control video generated!
                </span>
              </div>
              <video
                controls
                src={resultVideoUrl}
                className="w-full max-h-[400px] rounded-md bg-black"
                preload="metadata"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = resultVideoUrl;
                    a.download = "motion-control.mp4";
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  New Video
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Error display ────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-3 flex-shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Cost summary ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <h4 className="text-sm font-medium mb-2">Pipeline Cost Breakdown</h4>
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Frame Extraction</span>
            <br />
            Free (FFmpeg)
          </div>
          <div>
            <span className="font-medium text-foreground">Image Recreation</span>
            <br />
            ~$0.14 (Nano Banana Pro)
          </div>
          <div>
            <span className="font-medium text-foreground">Motion Control</span>
            <br />
            $0.56-$3.36 (Kling 2.6 Pro)
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Total estimated cost per video: ~$0.70-$3.50 depending on duration
        </p>
      </div>
    </div>
  );
}

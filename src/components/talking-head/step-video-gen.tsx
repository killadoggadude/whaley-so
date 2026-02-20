"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Video,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Subtitles,
} from "lucide-react";
import { toast } from "sonner";
import { CaptionCustomizerInline } from "./caption-customizer";
import { DEFAULT_CAPTION_SETTINGS } from "@/lib/caption-styles";
import type { CustomCaptionSettings } from "@/lib/caption-styles";
import { getAudioDuration, calculateVideoCost, formatDuration } from "@/lib/cost-estimation";

interface StepVideoGenProps {
  audioSignedUrl: string;
  imageSignedUrl: string;
  selectedImageUrl: string;
  audioUrl: string;
  script: string;
  onVideoReady: (videoUrl: string, captionedVideoUrl?: string, captionedAssetId?: string) => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 100; // ~5 minutes

type GenerationState =
  | "idle"
  | "submitting"
  | "polling"
  | "transcribing"
  | "burning"
  | "completed"
  | "failed";

export function StepVideoGen({
  audioSignedUrl,
  imageSignedUrl,
  selectedImageUrl,
  audioUrl,
  script,
  onVideoReady,
}: StepVideoGenProps) {
  const [resolution, setResolution] = useState("480p");
  const [state, setState] = useState<GenerationState>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef(false);

  // Caption settings
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionSettings, setCaptionSettings] = useState<CustomCaptionSettings>(
    { ...DEFAULT_CAPTION_SETTINGS }
  );

  // Cost estimation
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Calculate audio duration
  useEffect(() => {
    const calculateDuration = async () => {
      if (audioUrl) {
        setAudioDuration(null);
        const duration = await getAudioDuration(audioUrl);
        setAudioDuration(duration);
      }
    };

    calculateDuration();
  }, [audioUrl]);

  const addCaptions = useCallback(
    async (videoUrl: string) => {
      setState("transcribing");

      try {
        // 1. Transcribe audio for word timestamps
        const transcribeRes = await fetch("/api/talking-head/transcribe-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl: audioSignedUrl }),
        });

        const transcribeData = await transcribeRes.json();

        if (!transcribeRes.ok || !transcribeData.words?.length) {
          console.error("Caption transcription failed:", transcribeData.error);
          // Fallback: complete without captions
          toast.warning("Could not transcribe audio for captions. Video saved without captions.");
          setState("completed");
          onVideoReady(videoUrl);
          return;
        }

        // 2. Burn captions into video
        setState("burning");

        const captionRes = await fetch("/api/talking-head/add-captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl,
            words: transcribeData.words,
            customSettings: captionSettings,
          }),
        });

        const captionData = await captionRes.json();

        if (!captionRes.ok) {
          console.error("Caption burn-in failed:", captionData.error);
          toast.warning("Could not add captions. Video saved without captions.");
          setState("completed");
          onVideoReady(videoUrl);
          return;
        }

        setState("completed");
        toast.success("Video generated with captions!");
        onVideoReady(videoUrl, captionData.signedUrl, captionData.assetId);
      } catch (err) {
        console.error("Caption error:", err);
        toast.warning("Caption processing failed. Video saved without captions.");
        setState("completed");
        onVideoReady(videoUrl);
      }
    },
    [audioSignedUrl, captionSettings, onVideoReady]
  );

  const startPolling = useCallback(
    async (queueId: string) => {
      pollingRef.current = true;
      let attempts = 0;

      while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        setPollCount(attempts);

        try {
          const res = await fetch(
            `/api/talking-head/queue-status?queueId=${encodeURIComponent(queueId)}`
          );
          const data = await res.json();

          if (!res.ok) {
            setState("failed");
            setError(data.error || "Failed to check status");
            pollingRef.current = false;
            return;
          }

          if (data.status === "completed" && data.taskId) {
            pollingRef.current = false;
            setTaskId(data.taskId);
            await startWaveSpeedPolling(data.taskId);
            return;
          }

          if (data.status === "failed") {
            setState("failed");
            setError(data.error || "Video generation failed");
            pollingRef.current = false;
            return;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MS)
          );
        } catch {
          setState("failed");
          setError("Network error while checking status");
          pollingRef.current = false;
          return;
        }
      }

      if (pollingRef.current) {
        setState("failed");
        setError("Video generation timed out. Please try again.");
        pollingRef.current = false;
      }
    },
    [captionsEnabled, onVideoReady, addCaptions]
  );

  const startWaveSpeedPolling = useCallback(
    async (taskId: string) => {
      pollingRef.current = true;
      let attempts = 0;

      while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        setPollCount(attempts);

        try {
          const res = await fetch(
            `/api/talking-head/status?taskId=${encodeURIComponent(taskId)}`
          );
          const data = await res.json();

          if (!res.ok) {
            setState("failed");
            setError(data.error || "Failed to check status");
            pollingRef.current = false;
            return;
          }

          if (data.status === "completed" && data.videoUrl) {
            pollingRef.current = false;

            if (captionsEnabled) {
              // Run caption pipeline
              addCaptions(data.videoUrl);
            } else {
              setState("completed");
              toast.success("Video generated successfully!");
              onVideoReady(data.videoUrl);
            }
            return;
          }

          if (data.status === "failed") {
            setState("failed");
            setError(data.error || "Video generation failed");
            pollingRef.current = false;
            return;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MS)
          );
        } catch {
          setState("failed");
          setError("Network error while checking status");
          pollingRef.current = false;
          return;
        }
      }

      if (pollingRef.current) {
        setState("failed");
        setError("Video generation timed out. Please try again.");
        pollingRef.current = false;
      }
    },
    [captionsEnabled, onVideoReady, addCaptions]
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  const handleSubmit = async () => {
    setState("submitting");
    setError(null);
    setPollCount(0);

    try {
      const res = await fetch("/api/talking-head/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioSignedUrl,
          imageSignedUrl,
          resolution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("failed");
        setError(data.error || "Failed to queue video generation");
        return;
      }

      setState("polling");
      toast.info("Job queued. You'll be notified when it starts...");

      // Start polling queue
      startPolling(data.queueItem.id);
    } catch {
      setState("failed");
      setError("Failed to queue video generation");
    }
  };

  const handleRetry = () => {
    setState("idle");
    setError(null);
    setTaskId(null);
    setPollCount(0);
  };

  const estimatedCost =
    audioDuration !== null
      ? calculateVideoCost(audioDuration, resolution as "480p" | "720p").cost
      : null;

  const elapsedSeconds = pollCount * (POLL_INTERVAL_MS / 1000);
  const progressPercent =
    state === "transcribing"
      ? 85
      : state === "burning"
        ? 92
        : Math.min((pollCount / MAX_POLL_ATTEMPTS) * 100, 80);

  const isProcessing =
    state === "submitting" ||
    state === "polling" ||
    state === "transcribing" ||
    state === "burning";

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <Video className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Generate Talking Head Video</h2>
        <p className="text-sm text-muted-foreground">
          Review your selections and generate the lip-synced video.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-card p-4 space-y-3">
        <div className="flex gap-3">
          {/* Image preview */}
          <img
            src={selectedImageUrl}
            alt="Selected portrait"
            className="h-20 w-20 rounded-md object-cover border"
          />
          <div className="flex-1 space-y-1.5">
            {/* Audio preview */}
            <div>
              <p className="text-xs font-medium mb-1">Audio</p>
              <audio controls src={audioUrl} className="w-full h-8" />
            </div>
            {/* Script excerpt */}
            <div>
              <p className="text-xs font-medium">Script</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {script}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings (only in idle state) */}
      {state === "idle" && (
        <>
          {/* Resolution */}
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">
                  480p — $0.03/sec (Recommended)
                </SelectItem>
                <SelectItem value="720p">720p — $0.06/sec</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Minimum charge: $0.15. Max duration: 10 minutes.
            </p>
          </div>

          {/* Captions toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Subtitles className="h-4 w-4 text-muted-foreground" />
                <Label>Add Captions</Label>
              </div>
              <Switch
                checked={captionsEnabled}
                onCheckedChange={setCaptionsEnabled}
              />
            </div>

            {captionsEnabled && (
              <CaptionCustomizerInline
                settings={captionSettings}
                onChange={setCaptionSettings}
              />
            )}
          </div>

          {/* Cost Estimation */}
          <div className="rounded-lg bg-card p-4 space-y-2">
            <p className="text-xs font-medium">Estimated Cost</p>
            {audioDuration === null ? (
              <p className="text-sm text-muted-foreground">Estimating...</p>
            ) : (
              <>
                <div className="flex items-end gap-1">
                  <span className="text-xs text-muted-foreground">Duration: </span>
                  <span className="text-xs font-medium">{formatDuration(audioDuration)}</span>
                </div>
                <div className="flex items-center justify-center py-2 bg-muted/50 rounded">
                  <span className="text-sm text-muted-foreground mr-2">Total:</span>
                  <span className="text-2xl font-semibold text-green-600">
                    $
                    {calculateVideoCost(audioDuration, resolution as "480p" | "720p").cost.toFixed(
                      2
                    )}
                  </span>
                </div>
                {audioDuration < 5 && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Minimum charge: $0.15 applies
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Status display */}
      {isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
            <span className="text-sm font-medium">
              {state === "submitting" && "Submitting..."}
              {state === "polling" && "Generating video..."}
              {state === "transcribing" && "Transcribing audio for captions..."}
              {state === "burning" && "Burning captions into video..."}
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
              "Processing your video. This usually takes 1-3 minutes..."}
            {state === "polling" && pollCount >= 20 && pollCount < 60 &&
              "Still processing. Longer scripts take more time..."}
            {state === "polling" && pollCount >= 60 &&
              "Almost there. Please wait..."}
            {state === "transcribing" &&
              "Detecting word-level timing from your TTS audio..."}
            {state === "burning" &&
              "Rendering video with styled captions (this may take a minute)..."}
          </p>
        </div>
      )}

      {state === "completed" && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">
            Video generated{captionsEnabled ? " with captions" : ""}!
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      {state === "idle" && (
        <Button onClick={handleSubmit} className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90" size="lg">
          <Video className="h-4 w-4 mr-2" />
          Generate Video{captionsEnabled ? " with Captions" : ""}
          {estimatedCost !== null && ` — Est. $${estimatedCost.toFixed(2)}`}
        </Button>
      )}

      {state === "failed" && (
        <Button onClick={handleRetry} variant="outline" className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Powered by WaveSpeed InfiniteTalk.
      </p>
    </div>
  );
}

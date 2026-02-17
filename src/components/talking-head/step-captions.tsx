"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Subtitles,
  CheckCircle2,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { CAPTION_STYLES } from "@/lib/caption-styles";
import type { CaptionStyle } from "@/lib/caption-styles";
import type { WordTimestamp } from "@/types";

interface StepCaptionsProps {
  audioSignedUrl: string;
  videoUrl: string;
  onCaptioned: (captionedUrl: string, assetId: string) => void;
  onSkip: () => void;
}

type CaptionPhase = "idle" | "transcribing" | "burning" | "done" | "error";

export function StepCaptions({
  audioSignedUrl,
  videoUrl,
  onCaptioned,
  onSkip,
}: StepCaptionsProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    CAPTION_STYLES[0].id
  );
  const [phase, setPhase] = useState<CaptionPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captionedVideoUrl, setCaptionedVideoUrl] = useState<string | null>(
    null
  );

  const handleGenerate = async () => {
    setPhase("transcribing");
    setError(null);

    try {
      // Step 1: Transcribe audio → get word timestamps
      const transcribeRes = await fetch("/api/talking-head/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: audioSignedUrl }),
      });

      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok) {
        throw new Error(
          transcribeData.error || "Failed to transcribe audio"
        );
      }

      const words: WordTimestamp[] = transcribeData.words;
      if (!words || words.length === 0) {
        throw new Error("No speech detected in audio");
      }

      // Step 2: Burn captions into video
      setPhase("burning");

      const captionRes = await fetch("/api/talking-head/add-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          words,
          styleId: selectedStyleId,
        }),
      });

      const captionData = await captionRes.json();

      if (!captionRes.ok) {
        throw new Error(captionData.error || "Failed to add captions");
      }

      setPhase("done");
      setCaptionedVideoUrl(captionData.signedUrl);
      toast.success("Captions added successfully!");
      onCaptioned(captionData.signedUrl, captionData.assetId);
    } catch (err) {
      setPhase("error");
      const message =
        err instanceof Error ? err.message : "Caption generation failed";
      setError(message);
      toast.error(message);
    }
  };

  const progressValue =
    phase === "transcribing"
      ? 30
      : phase === "burning"
        ? 70
        : phase === "done"
          ? 100
          : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Subtitles className="h-5 w-5" />
          Add Captions
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add styled captions with word-by-word highlighting to your video.
          This step is optional — you can skip it.
        </p>
      </div>

      {/* Caption Style Selector */}
      <div className="space-y-3">
        <Label>Caption Style</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CAPTION_STYLES.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              selected={selectedStyleId === style.id}
              onClick={() => setSelectedStyleId(style.id)}
              disabled={phase === "transcribing" || phase === "burning"}
            />
          ))}
        </div>
      </div>

      {/* Progress */}
      {(phase === "transcribing" || phase === "burning") && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
            <span className="text-sm font-medium">
              {phase === "transcribing"
                ? "Transcribing audio..."
                : "Burning captions into video..."}
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {phase === "transcribing"
              ? "Detecting word-level timing from your TTS audio"
              : "Rendering video with styled captions (this may take a minute)"}
          </p>
        </div>
      )}

      {/* Error */}
      {phase === "error" && error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleGenerate}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Done */}
      {phase === "done" && captionedVideoUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              Captions added and saved to library!
            </span>
          </div>
          <video
            controls
            src={captionedVideoUrl}
            className="w-full max-h-[400px] rounded-lg bg-black"
            preload="metadata"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {phase === "idle" && (
          <>
            <Button onClick={handleGenerate} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Captions
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              <SkipForward className="h-4 w-4 mr-1.5" />
              Skip Captions
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function StyleCard({
  style,
  selected,
  onClick,
  disabled,
}: {
  style: CaptionStyle;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const previewWords = ["This", "is", "a", "caption"];
  const highlightIdx = 2; // Highlight "a" word to show highlight color

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-lg border-2 p-3 text-left transition-all",
        selected
          ? "border-accent-blue bg-accent-blue/5"
          : "border-transparent bg-muted/50 hover:border-muted-foreground/30",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {selected && (
        <Badge
          variant="default"
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
        >
          <CheckCircle2 className="h-3 w-3" />
        </Badge>
      )}

      <p className="text-xs font-medium mb-2">{style.name}</p>

      {/* Visual preview */}
      <div
        className={cn(
          "rounded-md p-3 flex items-center justify-center",
          style.previewBg
        )}
      >
        <p className="text-sm font-bold tracking-wide">
          {previewWords.map((word, idx) => (
            <span
              key={idx}
              className={cn(
                idx === highlightIdx
                  ? style.previewHighlight
                  : style.previewText,
                style.bold && "font-bold"
              )}
            >
              {word}{" "}
            </span>
          ))}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1.5">
        {style.fontFamily} &middot; {style.wordsPerPage} words/page
      </p>
    </button>
  );
}

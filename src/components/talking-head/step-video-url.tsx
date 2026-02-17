"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface StepVideoUrlProps {
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  onTranscriptReady: (transcript: string) => void;
}

export function StepVideoUrl({
  videoUrl,
  onVideoUrlChange,
  onTranscriptReady,
}: StepVideoUrlProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [videoUrl.trim()] }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Transcription failed");
        return;
      }

      if (!data.results || data.results.length === 0) {
        setError("No transcription results returned");
        return;
      }

      const result = data.results[0];

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.transcript || result.transcript.trim().length === 0) {
        setError("No speech detected in the video");
        return;
      }

      toast.success(
        `Transcribed ${result.word_count} words from ${result.platform}`
      );
      onTranscriptReady(result.transcript);
    } catch {
      setError("Failed to transcribe video. Check your WaveSpeed API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <Link2 className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Enter Video URL</h2>
        <p className="text-sm text-muted-foreground">
          Paste a video URL to transcribe. Supports Instagram, TikTok, YouTube,
          and X.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          placeholder="https://www.instagram.com/reel/..."
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleTranscribe}
        disabled={loading || !videoUrl.trim()}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Transcribing...
          </>
        ) : (
          "Transcribe Video"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Powered by WaveSpeed AI Whisper. You can also skip this step and type
        your script manually.
      </p>

      <Button
        variant="link"
        className="w-full text-xs"
        onClick={() => onTranscriptReady("")}
      >
        Skip — write script manually
      </Button>
    </div>
  );
}

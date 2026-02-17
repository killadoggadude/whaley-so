"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TranscriptionResults } from "@/components/tools/transcription-results";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TranscriptionResult } from "@/types";

export function TranscribeForm() {
  const [urls, setUrls] = useState("");
  const [results, setResults] = useState<TranscriptionResult[]>([]);
  const [loading, setLoading] = useState(false);

  const urlCount = urls
    .split("\n")
    .filter((u) => u.trim().length > 0).length;

  const handleTranscribe = async () => {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlList.length === 0) {
      toast.error("Enter at least one URL");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Transcription failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setResults(data.results);

      const successCount = data.results.filter(
        (r: TranscriptionResult) => !r.error
      ).length;
      toast.success(
        `Transcribed ${successCount}/${data.results.length} videos`
      );
    } catch (error) {
      toast.error("Failed to transcribe videos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl space-y-2">
        <Label htmlFor="urls">Video URLs (one per line)</Label>
        <Textarea
          id="urls"
          placeholder={`https://www.instagram.com/reel/...\nhttps://www.tiktok.com/@user/video/...\nhttps://www.youtube.com/watch?v=...`}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          {urlCount} URL{urlCount !== 1 ? "s" : ""} entered.
          Supports Instagram, TikTok, and YouTube.
        </p>

        <Button
          onClick={handleTranscribe}
          disabled={loading || urlCount === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Transcribing...
            </>
          ) : (
            `Transcribe ${urlCount} Video${urlCount !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>

      <TranscriptionResults results={results} />
    </div>
  );
}

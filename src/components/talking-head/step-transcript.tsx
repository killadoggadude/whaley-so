"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";

interface StepTranscriptProps {
  transcript: string;
  onUseAsScript: () => void;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function StepTranscript({
  transcript,
  onUseAsScript,
}: StepTranscriptProps) {
  const wordCount = countWords(transcript);

  // If user skipped transcription (empty transcript), go straight to edit
  if (!transcript.trim()) {
    return (
      <div className="max-w-xl mx-auto space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">No Transcript</h2>
        <p className="text-sm text-muted-foreground">
          You skipped transcription. Continue to write your script manually.
        </p>
        <Button onClick={onUseAsScript} size="lg">
          Write Script
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Transcript Ready</h2>
        <p className="text-sm text-muted-foreground">
          Review the transcription below. You&apos;ll be able to edit it in the
          next step.
        </p>
      </div>

      <div className="rounded-lg bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Transcription</span>
          <Badge variant="secondary">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </Badge>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {transcript}
        </p>
      </div>

      <Button onClick={onUseAsScript} className="w-full" size="lg">
        Continue to Edit Script
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";

interface StepScriptEditProps {
  script: string;
  onScriptChange: (script: string) => void;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function StepScriptEdit({
  script,
  onScriptChange,
}: StepScriptEditProps) {
  const wordCount = countWords(script);
  const charCount = script.length;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <Edit3 className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Edit Script</h2>
        <p className="text-sm text-muted-foreground">
          Edit the script that will be converted to speech. Remove filler words,
          fix errors, or rewrite as needed.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="script">Script</Label>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {charCount} chars
            </Badge>
          </div>
        </div>
        <Textarea
          id="script"
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          rows={12}
          placeholder="Type or paste your script here..."
          className="resize-y"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        This text will be spoken by your AI model&apos;s voice in the next step.
        Use the Next button to continue.
      </p>
    </div>
  );
}

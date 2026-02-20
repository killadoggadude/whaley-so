"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, FileText } from "lucide-react";
import { ScriptPicker, type Script } from "@/components/scripts/script-picker";
import { cn } from "@/lib/utils";

interface StepScriptEditProps {
  script: string;
  onScriptChange: (script: string) => void;
  onScriptIdChange?: (scriptId: string | null) => void;
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
  onScriptIdChange,
}: StepScriptEditProps) {
  const wordCount = countWords(script);
  const charCount = script.length;

  const [scriptPickerOpen, setScriptPickerOpen] = useState(false);
  const [usedScriptIds, setUsedScriptIds] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleScriptSelect = (selectedScript: Script) => {
    onScriptChange(selectedScript.script_text);
    onScriptIdChange?.(selectedScript.id);
    setUsedScriptIds((prev) => [...prev, selectedScript.id]);
    setScriptPickerOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const droppedScript = JSON.parse(e.dataTransfer.getData("text/plain")) as Script;
      if (usedScriptIds.includes(droppedScript.id)) return;
      onScriptChange(droppedScript.script_text);
      onScriptIdChange?.(droppedScript.id);
      setUsedScriptIds((prev) => [...prev, droppedScript.id]);
    } catch {
      // Not a valid script drop
    }
  };

  return (
    <>
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

        <div
          className="space-y-2"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="script">Script</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setScriptPickerOpen(true)}
              >
                <FileText className="h-3 w-3 mr-1" />
                Library
              </Button>
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
            placeholder="Type or paste your script here, or drag from Library..."
            className={cn(
              "resize-y",
              isDragOver && "ring-2 ring-accent-blue ring-offset-1"
            )}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          This text will be spoken by your model&apos;s voice in the next step.
          Use the Next button to continue.
        </p>
      </div>

      <ScriptPicker
        open={scriptPickerOpen}
        onOpenChange={setScriptPickerOpen}
        usedScriptIds={usedScriptIds}
        onSelect={handleScriptSelect}
      />
    </>
  );
}

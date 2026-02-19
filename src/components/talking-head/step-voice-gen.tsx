"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AudioPlayer } from "@/components/tools/audio-player";
import { Loader2, Mic, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { calculateTTSCost } from "@/lib/cost-estimation";
import type { AiModelWithImages } from "@/types";

interface StepVoiceGenProps {
  script: string;
  aiModels: AiModelWithImages[];
  selectedModel: AiModelWithImages | null;
  onModelChange: (model: AiModelWithImages | null) => void;
  audioUrl: string | null;
  onAudioGenerated: (blobUrl: string, signedUrl: string) => void;
}

export function StepVoiceGen({
  script,
  aiModels,
  selectedModel,
  onModelChange,
  audioUrl,
  onAudioGenerated,
}: StepVoiceGenProps) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to models that have a voice_id configured
  const voiceModels = aiModels.filter((m) => m.voice_id && m.voice_id.trim());

  const estimatedCost = calculateTTSCost(script);

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error("Select a model first");
      return;
    }

    if (!script.trim()) {
      toast.error("Script is empty");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // 1. Generate TTS audio
      const ttsRes = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          voice_id: selectedModel.voice_id,
          settings: selectedModel.voice_settings,
        }),
      });

      if (!ttsRes.ok) {
        const errorData = await ttsRes.json().catch(() => null);
        setError(
          errorData?.error || `TTS generation failed (${ttsRes.status})`
        );
        return;
      }

      // 2. Create blob URL for preview
      const audioBlob = await ttsRes.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      // 3. Upload audio to storage (InfiniteTalk needs a public URL)
      setUploading(true);
      const formData = new FormData();
      formData.append("file", audioBlob, "talking-head-audio.mp3");

      const uploadRes = await fetch("/api/talking-head/upload-audio", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setError(uploadData.error || "Failed to upload audio");
        // Still provide blob URL for preview even if upload fails
        return;
      }

      toast.success("Voice generated and uploaded");
      onAudioGenerated(blobUrl, uploadData.signedUrl);
    } catch {
      setError("Failed to generate voice. Check your ElevenLabs API key.");
    } finally {
      setGenerating(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <Mic className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Generate Voice</h2>
        <p className="text-sm text-muted-foreground">
          Select an AI model and generate the voiceover for your script.
        </p>
      </div>

      {voiceModels.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No models with voice configured. Add voice settings (ElevenLabs
            voice ID) to your models in the{" "}
            <a href="/dashboard/models" className="underline font-medium">
              Models
            </a>{" "}
            page.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={selectedModel?.id || ""}
              onValueChange={(v) => {
                const model = voiceModels.find((m) => m.id === v) || null;
                onModelChange(model);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {voiceModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center gap-2">
                      {model.reference_images.length > 0 ? (
                        <img
                          src={model.reference_images[0].signed_url}
                          alt=""
                          className="h-5 w-5 rounded-sm object-cover"
                        />
                      ) : (
                        <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {model.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedModel && (
            <div className="rounded-lg bg-card p-3 space-y-1.5">
              <p className="text-xs font-medium">Voice Settings</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>
                  Stability: {selectedModel.voice_settings.stability}
                </span>
                <span>
                  Similarity:{" "}
                  {selectedModel.voice_settings.similarity_boost}
                </span>
                <span>Style: {selectedModel.voice_settings.style}</span>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-card p-3">
            <p className="text-xs font-medium mb-1">Script Preview</p>
            <p className="text-xs text-muted-foreground line-clamp-3">
              {script}
            </p>
          </div>

          <div className="rounded-lg bg-card p-3 space-y-1">
            <p className="text-xs font-medium mb-1">Estimated Cost</p>
            <div className="flex items-center justify-center py-2 bg-muted/50 rounded">
              <span className="text-sm text-muted-foreground mr-2">Total:</span>
              <span className="text-2xl font-semibold text-green-600">
                ${estimatedCost.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Based on {script.length} characters at ~$0.00022/char
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || uploading || !selectedModel}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating voice...
              </>
            ) : uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading audio...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Generate Voice — Est. ${estimatedCost.toFixed(2)}
              </>
            )}
          </Button>

          {audioUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Audio Ready</span>
              </div>
              <AudioPlayer audioUrl={audioUrl} />
              <p className="text-xs text-muted-foreground">
                Use the Next button to continue to image selection.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

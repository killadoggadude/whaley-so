"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { AudioPlayer } from "@/components/tools/audio-player";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TtsForm() {
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const charCount = text.length;

  const handleGenerate = async () => {
    if (!text.trim() || !voiceId.trim()) {
      toast.error("Text and Voice ID are required");
      return;
    }

    setLoading(true);
    setAudioUrl(null);

    try {
      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: voiceId.trim(),
          settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Generation failed");
        setLoading(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      toast.success("Audio generated successfully");
    } catch (error) {
      toast.error("Failed to generate audio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="text">Text</Label>
        <Textarea
          id="text"
          placeholder="Enter text to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">{charCount} characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voiceId">Voice ID</Label>
        <Input
          id="voiceId"
          placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Find voice IDs in your ElevenLabs dashboard
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Voice Settings</h4>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Stability</Label>
            <span className="text-xs text-muted-foreground">
              {stability.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[stability]}
            onValueChange={(v) => setStability(v[0])}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Clarity + Similarity</Label>
            <span className="text-xs text-muted-foreground">
              {similarityBoost.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[similarityBoost]}
            onValueChange={(v) => setSimilarityBoost(v[0])}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Style Exaggeration</Label>
            <span className="text-xs text-muted-foreground">
              {style.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[style]}
            onValueChange={(v) => setStyle(v[0])}
            min={0}
            max={1}
            step={0.05}
          />
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={loading || !text || !voiceId}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Audio"
        )}
      </Button>

      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
    </div>
  );
}

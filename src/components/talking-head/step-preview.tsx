"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Save,
  Play,
  RefreshCw,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface StepPreviewProps {
  videoUrl: string;
  videoAssetId: string | null;
  onSaved: (assetId: string) => void;
  onStartNew: () => void;
}

export function StepPreview({
  videoUrl,
  videoAssetId,
  onSaved,
  onStartNew,
}: StepPreviewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/talking-head/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save video");
        return;
      }

      toast.success("Video saved to asset library!");
      onSaved(data.assetId);
    } catch {
      setError("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `talking-head-${Date.now()}.mp4`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
          <Play className="h-6 w-6 text-accent-blue" />
        </div>
        <h2 className="text-lg font-semibold">Video Ready</h2>
        <p className="text-sm text-muted-foreground">
          Preview your talking head video below. Download or save it to your
          asset library.
        </p>
      </div>

      {/* Video player */}
      <div className="rounded-lg overflow-hidden bg-black">
        <video
          controls
          src={videoUrl}
          className="w-full max-h-[500px]"
          autoPlay={false}
          preload="metadata"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>

        {videoAssetId ? (
          <Button disabled className="flex-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Saved to Library
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save to Library
              </>
            )}
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        onClick={onStartNew}
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Start New Video
      </Button>
    </div>
  );
}

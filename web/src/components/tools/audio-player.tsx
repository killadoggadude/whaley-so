"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `tts-${Date.now()}.mp3`;
    a.click();
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <audio controls src={audioUrl} className="flex-1" />
      <Button size="sm" variant="outline" onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
    </div>
  );
}

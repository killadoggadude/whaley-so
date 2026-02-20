import { TranscribeForm } from "@/components/tools/transcribe-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default function TranscribePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Video Transcription</h2>
      <p className="text-muted-foreground mb-4">
        Transcribe videos from Instagram, TikTok, and YouTube using Wavespeed
        Whisper. Requires a Wavespeed API key in Settings.
      </p>

      <Alert className="mb-6 max-w-2xl">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Some social media URLs may not be directly accessible. If
          transcription fails, try using a direct video URL instead.
        </AlertDescription>
      </Alert>

      <TranscribeForm />
    </div>
  );
}

import { TtsForm } from "@/components/tools/tts-form";

export const dynamic = "force-dynamic";

export default function TtsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Text to Speech</h2>
      <p className="text-muted-foreground mb-6">
        Generate audio from text using ElevenLabs. Requires an ElevenLabs API
        key in Settings.
      </p>
      <TtsForm />
    </div>
  );
}

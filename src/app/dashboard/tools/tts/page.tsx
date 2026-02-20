import { TtsForm } from "@/components/tools/tts-form";

export const dynamic = "force-dynamic";

export default function TtsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Text to Speech</h2>
      <p className="text-muted-foreground mb-6">
        Generate audio from text using ElevenLabs. Requires an ElevenLabs API
        key in Settings.
      </p>
      <TtsForm />
    </div>
  );
}

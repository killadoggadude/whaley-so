"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Edit3,
  Mic,
  ImageIcon,
  Video,
  Play,
  Link2,
} from "lucide-react";
import { StepVideoUrl } from "./step-video-url";
import { StepTranscript } from "./step-transcript";
import { StepScriptEdit } from "./step-script-edit";
import { StepVoiceGen } from "./step-voice-gen";
import { StepImageSelect } from "./step-image-select";
import { StepVideoGen } from "./step-video-gen";
import { StepPreview } from "./step-preview";
import type { AiModelWithImages } from "@/types";

interface TalkingHeadWizardProps {
  aiModels: AiModelWithImages[];
  prefillVideoUrl?: string;
}

const STEPS = [
  { label: "Video URL", icon: Link2 },
  { label: "Transcript", icon: FileText },
  { label: "Edit Script", icon: Edit3 },
  { label: "Voice", icon: Mic },
  { label: "Image", icon: ImageIcon },
  { label: "Generate", icon: Video },
  { label: "Preview", icon: Play },
] as const;

export function TalkingHeadWizard({ aiModels, prefillVideoUrl }: TalkingHeadWizardProps) {
  const [step, setStep] = useState(1);

  // Wizard state
  const [videoUrl, setVideoUrl] = useState(prefillVideoUrl || "");
  const [transcript, setTranscript] = useState("");
  const [editedScript, setEditedScript] = useState("");
  const [selectedModel, setSelectedModel] =
    useState<AiModelWithImages | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSignedUrl, setAudioSignedUrl] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
    null
  );
  const [captionedVideoUrl, setCaptionedVideoUrl] = useState<string | null>(
    null
  );
  const [captionedAssetId, setCaptionedAssetId] = useState<string | null>(null);
  const [videoAssetId, setVideoAssetId] = useState<string | null>(null);

  // Can the user proceed forward?
  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1:
        return transcript.length > 0;
      case 2:
        return editedScript.length > 0;
      case 3:
        return editedScript.length > 0;
      case 4:
        return audioUrl !== null && audioSignedUrl !== null;
      case 5:
        return selectedImageUrl !== null;
      case 6:
        return generatedVideoUrl !== null;
      case 7:
        return true;
      default:
        return false;
    }
  }, [
    step,
    transcript,
    editedScript,
    audioUrl,
    audioSignedUrl,
    selectedImageUrl,
    generatedVideoUrl,
  ]);

  const handleNext = useCallback(() => {
    if (step < 7 && canProceed()) {
      setStep((s) => s + 1);
    }
  }, [step, canProceed]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleReset = useCallback(() => {
    setStep(1);
    setVideoUrl("");
    setTranscript("");
    setEditedScript("");
    setSelectedModel(null);
    setAudioUrl(null);
    setAudioSignedUrl(null);
    setSelectedImageUrl(null);
    setSelectedImageId(null);
    setGeneratedVideoUrl(null);
    setCaptionedVideoUrl(null);
    setCaptionedAssetId(null);
    setVideoAssetId(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          const StepIcon = s.icon;

          return (
            <div key={stepNum} className="flex items-center gap-1">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-px w-4 sm:w-8",
                    isCompleted ? "bg-accent-blue" : "bg-border"
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (isCompleted) setStep(stepNum);
                }}
                disabled={!isCompleted && !isActive}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  isActive &&
                    "bg-accent-blue text-white",
                  isCompleted &&
                    "bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 cursor-pointer",
                  !isActive &&
                    !isCompleted &&
                    "bg-muted text-muted-foreground cursor-default"
                )}
              >
                <StepIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{s.label}</span>
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {stepNum}
                </Badge>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 1 && (
          <StepVideoUrl
            videoUrl={videoUrl}
            onVideoUrlChange={setVideoUrl}
            onTranscriptReady={(t) => {
              setTranscript(t);
              setEditedScript(t);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepTranscript
            transcript={transcript}
            onUseAsScript={() => {
              setEditedScript(transcript);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <StepScriptEdit
            script={editedScript}
            onScriptChange={setEditedScript}
          />
        )}
        {step === 4 && (
          <StepVoiceGen
            script={editedScript}
            aiModels={aiModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            audioUrl={audioUrl}
            onAudioGenerated={(blobUrl, signedUrl) => {
              setAudioUrl(blobUrl);
              setAudioSignedUrl(signedUrl);
            }}
          />
        )}
        {step === 5 && (
          <StepImageSelect
            selectedModel={selectedModel}
            selectedImageId={selectedImageId}
            onImageSelect={(id, url) => {
              setSelectedImageId(id);
              setSelectedImageUrl(url);
            }}
          />
        )}
        {step === 6 && (
          <StepVideoGen
            audioSignedUrl={audioSignedUrl!}
            imageSignedUrl={selectedImageUrl!}
            selectedImageUrl={selectedImageUrl!}
            audioUrl={audioUrl!}
            script={editedScript}
            onVideoReady={(url, captionedUrl, captAssetId) => {
              setGeneratedVideoUrl(url);
              if (captionedUrl) setCaptionedVideoUrl(captionedUrl);
              if (captAssetId) setCaptionedAssetId(captAssetId);
              setStep(7);
            }}
          />
        )}
        {step === 7 && (
          <StepPreview
            videoUrl={captionedVideoUrl || generatedVideoUrl!}
            videoAssetId={captionedAssetId || videoAssetId}
            onSaved={(assetId) => setVideoAssetId(assetId)}
            onStartNew={handleReset}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {step < 7 && step !== 6 && (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

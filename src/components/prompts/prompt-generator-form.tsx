"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type PromptProvider = "google" | "openai" | "anthropic";

interface PromptGeneratorFormProps {
  onGenerated: (
    prompts: string[],
    imagePreviewUrl: string,
    sourceImageAssetId: string | null
  ) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PROVIDER_LABELS: Record<PromptProvider, string> = {
  google: "Google Gemini (Recommended)",
  openai: "OpenAI (GPT-4o)",
  anthropic: "Claude (Anthropic)",
};

export function PromptGeneratorForm({ onGenerated }: PromptGeneratorFormProps) {
  const [provider, setProvider] = useState<PromptProvider>("google");
  const [customInstructions, setCustomInstructions] = useState("");
  const [variationCount, setVariationCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported format. Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 20MB.");
      return;
    }

    setImageFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleGenerate = async () => {
    if (!imageFile || !imagePreview) {
      toast.error("Upload an image first");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload source image to asset library for permanent reference
      let sourceImageAssetId: string | null = null;
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("tags", JSON.stringify(["prompt-source"]));

        const uploadRes = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.asset?.id) {
          sourceImageAssetId = uploadData.asset.id;
        }
      } catch {
        console.warn("Failed to upload source image to asset library");
      }

      // 2. Convert to base64
      const base64 = imagePreview.split(",")[1];

      // 3. Generate prompt(s)
      const response = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          image_base64: base64,
          content_type: imageFile.type,
          custom_instructions: customInstructions.trim() || undefined,
          variation_count: variationCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Generation failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      const prompts: string[] = data.prompts || [data.prompt];

      toast.success(
        prompts.length > 1
          ? `${prompts.length} prompt variations generated!`
          : "Prompt generated!"
      );

      onGenerated(prompts, imagePreview, sourceImageAssetId);
    } catch {
      toast.error("Failed to generate prompt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg bg-card border border-border p-6 transition-colors duration-200 hover:bg-card-hover">
      <h3 className="text-lg font-semibold">Analyze Image</h3>
      <p className="text-sm text-muted-foreground">
        Upload an inspiration image and AI will generate a detailed prompt to
        recreate the scene.
      </p>

      {/* AI Provider selector */}
      <div className="space-y-2">
        <Label>AI Provider</Label>
        <Select
          value={provider}
          onValueChange={(v) => setProvider(v as PromptProvider)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="google">{PROVIDER_LABELS.google}</SelectItem>
            <SelectItem value="openai">{PROVIDER_LABELS.openai}</SelectItem>
            <SelectItem value="anthropic">
              {PROVIDER_LABELS.anthropic}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {provider === "google"
            ? "Best for analyzing photos of people. Fast and reliable."
            : provider === "openai"
              ? "API may decline to analyze photos of real people."
              : "May decline to analyze photos of real people."}
        </p>
      </div>

      {/* Image upload area */}
      <div className="space-y-2">
        <Label>Image</Label>

        {imagePreview ? (
          <div className="relative flex gap-3 items-center rounded-md p-3 bg-muted/30">
            <img
              src={imagePreview}
              alt="Uploaded"
              className="h-24 w-24 rounded-md object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">{imageFile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {imageFile
                  ? `${(imageFile.size / 1024 / 1024).toFixed(1)} MB`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {PROVIDER_LABELS[provider]} will analyze this image and generate
                a detailed recreation prompt.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearImage}
              className="absolute top-2 right-2 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
              dragOver
                ? "border-accent-blue bg-accent-blue/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            {dragOver ? (
              <Upload className="h-8 w-8 text-accent-blue" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {dragOver
                  ? "Drop image here"
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP, or GIF (max 20MB)
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Variation count */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Variations</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {variationCount}
          </span>
        </div>
        <Slider
          value={[variationCount]}
          onValueChange={([v]) => setVariationCount(v)}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          {variationCount === 1
            ? "Generate 1 prompt from this image."
            : `Generate ${variationCount} variations — same pose, different outfit colors & backgrounds.`}
        </p>
      </div>

      {/* Custom instructions */}
      <div className="space-y-2">
        <Label htmlFor="custom-instructions">
          Custom Instructions{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="custom-instructions"
          placeholder="e.g., Focus on the lighting setup, emphasize the color palette, describe the background in more detail..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={3}
        />
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || !imageFile}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing image &amp; generating {variationCount > 1 ? `${variationCount} prompts` : "prompt"}...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze Image &amp; Generate {variationCount > 1 ? `${variationCount} Prompts` : "Prompt"}
          </>
        )}
      </Button>
    </div>
  );
}

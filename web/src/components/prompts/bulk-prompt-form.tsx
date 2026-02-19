"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  Upload,
  ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { savePromptsAction } from "@/app/dashboard/tools/prompts/actions";

type PromptProvider = "google" | "openai" | "anthropic";

interface BulkImageItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "analyzing" | "saving" | "done" | "error";
  error?: string;
  assetId?: string;
  promptCount?: number;
}

interface BulkPromptFormProps {
  onComplete: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const PROVIDER_LABELS: Record<PromptProvider, string> = {
  google: "Google Gemini (Recommended)",
  openai: "OpenAI (GPT-4o)",
  anthropic: "Claude (Anthropic)",
};

export function BulkPromptForm({ onComplete }: BulkPromptFormProps) {
  const [provider, setProvider] = useState<PromptProvider>("google");
  const [customInstructions, setCustomInstructions] = useState("");
  const [variationCount, setVariationCount] = useState(1);
  const [images, setImages] = useState<BulkImageItem[]>([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: BulkImageItem[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: exceeds 20MB`);
        continue;
      }

      // Create preview synchronously-ish via object URL
      const preview = URL.createObjectURL(file);
      newItems.push({
        id: crypto.randomUUID(),
        file,
        preview,
        status: "pending",
      });
    }

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateImage = (id: string, updates: Partial<BulkImageItem>) => {
    setImages((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
  };

  const processImage = async (item: BulkImageItem): Promise<void> => {
    try {
      // 1. Upload to asset library
      updateImage(item.id, { status: "uploading" });

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("tags", JSON.stringify(["prompt-source"]));

      const uploadRes = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        updateImage(item.id, {
          status: "error",
          error: uploadData.error || "Upload failed",
        });
        return;
      }

      const assetId = uploadData.asset?.id || null;
      updateImage(item.id, { assetId });

      // 2. Convert to base64 for API
      updateImage(item.id, { status: "analyzing" });

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(item.file);
      });

      // 3. Generate prompts
      const genRes = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          image_base64: base64,
          content_type: item.file.type,
          custom_instructions: customInstructions.trim() || undefined,
          variation_count: variationCount,
        }),
      });

      const genData = await genRes.json();

      if (!genRes.ok) {
        updateImage(item.id, {
          status: "error",
          error: genData.error || "Generation failed",
        });
        return;
      }

      const prompts: string[] = genData.prompts || [genData.prompt];

      // 4. Auto-save all prompts
      updateImage(item.id, { status: "saving" });

      const rows = prompts.map((text: string, idx: number) => ({
        model_id: null,
        source_image_id: assetId,
        prompt_text: text.trim(),
        prompt_index: idx,
        variation_label: prompts.length > 1 ? `Variation ${idx + 1}` : "",
        metadata: { provider, bulk: true },
      }));

      const saveResult = await savePromptsAction(rows);

      if (!saveResult.success) {
        updateImage(item.id, {
          status: "error",
          error: saveResult.error || "Save failed",
        });
        return;
      }

      updateImage(item.id, {
        status: "done",
        promptCount: prompts.length,
      });
    } catch (err) {
      updateImage(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Processing failed",
      });
    }
  };

  const handleRunAll = async () => {
    const pending = images.filter((i) => i.status === "pending");
    if (pending.length === 0) {
      toast.error("No images to process");
      return;
    }

    setRunning(true);
    toast.info(`Processing ${pending.length} image${pending.length > 1 ? "s" : ""}...`);

    // Process sequentially to avoid rate limits
    for (const item of pending) {
      await processImage(item);
    }

    setRunning(false);

    const doneCount = images.filter((i) => i.status === "done").length + pending.filter((i) => true).length;
    toast.success("Bulk processing complete!");
    onComplete();
  };

  // Stats
  const pendingCount = images.filter((i) => i.status === "pending").length;
  const processingCount = images.filter(
    (i) =>
      i.status === "uploading" ||
      i.status === "analyzing" ||
      i.status === "saving"
  ).length;
  const doneCount = images.filter((i) => i.status === "done").length;
  const errorCount = images.filter((i) => i.status === "error").length;
  const totalProcessed = doneCount + errorCount;
  const totalToProcess = images.filter((i) => i.status !== "done" && i.status !== "error").length;
  const progress =
    images.length > 0
      ? Math.round((totalProcessed / images.length) * 100)
      : 0;

  return (
    <div className="space-y-4 rounded-lg bg-card border border-border p-6 transition-colors duration-200 hover:bg-[oklch(0.11_0_0)]">
      <h3 className="text-lg font-semibold">Bulk Analyze Images</h3>
      <p className="text-sm text-muted-foreground">
        Upload multiple images. Each will be analyzed and prompts auto-saved.
      </p>

      {/* Settings row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as PromptProvider)}
            disabled={running}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">{PROVIDER_LABELS.google}</SelectItem>
              <SelectItem value="openai">{PROVIDER_LABELS.openai}</SelectItem>
              <SelectItem value="anthropic">{PROVIDER_LABELS.anthropic}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Variations per Image</Label>
            <span className="text-xs text-muted-foreground font-mono">{variationCount}</span>
          </div>
          <Slider
            value={[variationCount]}
            onValueChange={([v]) => setVariationCount(v)}
            min={1}
            max={10}
            step={1}
            disabled={running}
          />
          <p className="text-xs text-muted-foreground">
            {variationCount === 1
              ? "1 prompt per image"
              : `${variationCount} variations per image (different outfits & backgrounds)`}
          </p>
        </div>
      </div>

      {/* Custom instructions */}
      <div className="space-y-2">
        <Label>
          Custom Instructions{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Applied to all images..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={2}
          disabled={running}
        />
      </div>

      {/* Drop zone */}
      {!running && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            dragOver
              ? "border-accent-blue bg-accent-blue/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          {dragOver ? (
            <Upload className="h-6 w-6 text-accent-blue" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {dragOver ? "Drop images here" : "Click or drag to add images"}
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or GIF (max 20MB each)
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">
              Images ({images.length})
            </Label>
            {!running && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  images.forEach((i) => URL.revokeObjectURL(i.preview));
                  setImages([]);
                }}
                className="text-xs text-muted-foreground"
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {images.map((item) => (
              <div key={item.id} className="relative group">
                <div
                  className={cn(
                    "aspect-square rounded-md overflow-hidden border-2 transition-colors",
                    item.status === "done" && "border-green-500/50",
                    item.status === "error" && "border-destructive/50",
                    item.status === "pending" && "border-transparent",
                    (item.status === "uploading" ||
                      item.status === "analyzing" ||
                      item.status === "saving") &&
                      "border-accent-blue/50"
                  )}
                >
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />

                  {/* Overlay for status */}
                  {item.status !== "pending" && item.status !== "done" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      {item.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      )}
                    </div>
                  )}

                  {item.status === "done" && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                {!running && item.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Prompt count badge */}
                {item.status === "done" && item.promptCount && (
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 right-1 text-[9px] px-1 py-0"
                  >
                    {item.promptCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Error messages */}
          {images
            .filter((i) => i.status === "error" && i.error)
            .map((i) => (
              <p key={i.id} className="text-xs text-destructive">
                {i.file.name}: {i.error}
              </p>
            ))}
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
            <span className="text-sm font-medium">
              Processing {totalProcessed} of {images.length} images...
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-2 text-xs text-muted-foreground">
            {doneCount > 0 && (
              <span className="text-green-600">{doneCount} done</span>
            )}
            {errorCount > 0 && (
              <span className="text-destructive">{errorCount} failed</span>
            )}
            {processingCount > 0 && <span>{processingCount} processing</span>}
          </div>
        </div>
      )}

      {/* Action button */}
      <Button
        onClick={handleRunAll}
        disabled={running || pendingCount === 0}
        className="w-full"
        size="lg"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze {pendingCount} Image{pendingCount !== 1 ? "s" : ""}
            {variationCount > 1 && ` (${pendingCount * variationCount} prompts)`}
          </>
        )}
      </Button>
    </div>
  );
}

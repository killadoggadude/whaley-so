"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptGeneratorForm } from "@/components/prompts/prompt-generator-form";
import { PromptResultCard } from "@/components/prompts/prompt-result-card";
import { SavedPromptsList } from "@/components/prompts/saved-prompts-list";
import { BulkPromptForm } from "@/components/prompts/bulk-prompt-form";
import { PromptLibrary } from "@/components/prompts/prompt-library";
import { Save, Loader2, ImageIcon, Layers, Music, Video } from "lucide-react";
import { toast } from "sonner";
import {
  savePromptsAction,
  getPromptsAction,
} from "@/app/dashboard/tools/prompts/actions";
import type { PromptWithSourceImage } from "@/types";

interface PromptGeneratorProps {
  initialPrompts: PromptWithSourceImage[];
}

export function PromptGenerator({ initialPrompts }: PromptGeneratorProps) {
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(
    null
  );
  const [sourceImageAssetId, setSourceImageAssetId] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const [savedPrompts, setSavedPrompts] =
    useState<PromptWithSourceImage[]>(initialPrompts);

  const handleGenerated = (
    prompts: string[],
    imagePreviewUrl: string,
    assetId: string | null
  ) => {
    setGeneratedPrompts(prompts);
    setSourceImagePreview(imagePreviewUrl);
    setSourceImageAssetId(assetId);
  };

  const handlePromptChange = (index: number, newText: string) => {
    setGeneratedPrompts((prev) =>
      prev.map((p, i) => (i === index ? newText : p))
    );
  };

  const handleSaveAll = async () => {
    if (generatedPrompts.length === 0) return;

    setSaving(true);

    const rows = generatedPrompts.map((text, idx) => ({
      model_id: null,
      source_image_id: sourceImageAssetId,
      prompt_text: text,
      prompt_index: idx,
      variation_label:
        generatedPrompts.length > 1 ? `Variation ${idx + 1}` : "",
    }));

    const result = await savePromptsAction(rows);

    setSaving(false);

    if (result.success) {
      toast.success(
        rows.length > 1
          ? `${rows.length} prompts saved!`
          : "Prompt saved!"
      );
      setGeneratedPrompts([]);
      setSourceImagePreview(null);
      setSourceImageAssetId(null);
      refreshSavedPrompts();
    } else {
      toast.error(result.error || "Failed to save");
    }
  };

  const refreshSavedPrompts = useCallback(async () => {
    const result = await getPromptsAction({ limit: 50, video_type: null });
    if (!result.error) {
      setSavedPrompts(result.prompts);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="my-prompts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="my-prompts" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            My Prompts
          </TabsTrigger>
          <TabsTrigger value="dancing-reel" className="gap-1.5">
            <Music className="h-3.5 w-3.5" />
            Dancing Reel
          </TabsTrigger>
          <TabsTrigger value="talking-head" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Talking Head
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-prompts" className="mt-6">
          <div className="space-y-8 max-w-3xl">
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                <TabsTrigger value="single" className="gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Single Image
                </TabsTrigger>
                <TabsTrigger value="bulk" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Bulk Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="mt-4">
                <PromptGeneratorForm onGenerated={handleGenerated} />

                {generatedPrompts.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Generated Prompt{generatedPrompts.length > 1 ? "s" : ""}
                        {generatedPrompts.length > 1 && (
                          <span className="text-sm text-muted-foreground font-normal ml-2">
                            ({generatedPrompts.length} variations)
                          </span>
                        )}
                      </h3>
                      <Button onClick={handleSaveAll} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save {generatedPrompts.length > 1 ? "All" : "Prompt"}
                          </>
                        )}
                      </Button>
                    </div>

                    {sourceImagePreview && (
                      <div className="flex gap-3 items-center rounded-md p-3 bg-muted/30">
                        <img
                          src={sourceImagePreview}
                          alt="Analyzed"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                        <p className="text-xs text-muted-foreground">
                          {generatedPrompts.length > 1
                            ? `${generatedPrompts.length} prompt variations generated from this image`
                            : "Prompt generated from this image"}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {generatedPrompts.map((prompt, idx) => (
                        <div key={idx}>
                          {generatedPrompts.length > 1 && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Variation {idx + 1}
                            </p>
                          )}
                          <PromptResultCard
                            prompt={prompt}
                            onPromptChange={(newText) =>
                              handlePromptChange(idx, newText)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bulk" className="mt-4">
                <BulkPromptForm onComplete={refreshSavedPrompts} />
              </TabsContent>
            </Tabs>

            {savedPrompts.length > 0 && (
              <>
                <Separator />
                <SavedPromptsList
                  prompts={savedPrompts}
                  onPromptsChange={refreshSavedPrompts}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dancing-reel" className="mt-6">
          <div className="max-w-3xl">
            <PromptLibrary videoType="dancing_reel" title="Dancing Reel" />
          </div>
        </TabsContent>

        <TabsContent value="talking-head" className="mt-6">
          <div className="max-w-3xl">
            <PromptLibrary videoType="talking_head" title="Talking Head" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

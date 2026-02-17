"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ReferenceImagePicker } from "@/components/models/reference-image-picker";
import { Loader2, Plus, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createModelAction,
  updateModelAction,
} from "@/app/dashboard/models/actions";
import type { AiModelWithImages, AssetWithUrl } from "@/types";

interface ModelFormDialogProps {
  model: AiModelWithImages | null; // null = create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ModelFormDialog({
  model,
  open,
  onOpenChange,
  onSave,
}: ModelFormDialogProps) {
  const isEditing = !!model;

  // Basic info
  const [name, setName] = useState(model?.name ?? "");
  const [description, setDescription] = useState(model?.description ?? "");

  // Reference images
  const [selectedImages, setSelectedImages] = useState<AssetWithUrl[]>(
    model?.reference_images ?? []
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Voice settings
  const [voiceId, setVoiceId] = useState(model?.voice_id ?? "");
  const [stability, setStability] = useState(
    model?.voice_settings?.stability ?? 0.5
  );
  const [similarityBoost, setSimilarityBoost] = useState(
    model?.voice_settings?.similarity_boost ?? 0.75
  );
  const [style, setStyle] = useState(model?.voice_settings?.style ?? 0);

  const [saving, setSaving] = useState(false);

  // Reset form when model changes
  const resetForm = () => {
    setName(model?.name ?? "");
    setDescription(model?.description ?? "");
    setSelectedImages(model?.reference_images ?? []);
    setVoiceId(model?.voice_id ?? "");
    setStability(model?.voice_settings?.stability ?? 0.5);
    setSimilarityBoost(model?.voice_settings?.similarity_boost ?? 0.75);
    setStyle(model?.voice_settings?.style ?? 0);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetForm();
    onOpenChange(o);
  };

  const removeImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handlePickerConfirm = (selected: AssetWithUrl[]) => {
    setSelectedImages(selected);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Model name is required");
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      description: description.trim(),
      voice_id: voiceId.trim(),
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
      },
      reference_image_ids: selectedImages.map((img) => img.id),
    };

    const result = isEditing
      ? await updateModelAction(model.id, data)
      : await createModelAction(data);

    setSaving(false);

    if (result.success) {
      toast.success(isEditing ? "Model updated" : "Model created");
      onSave();
      handleOpenChange(false);
    } else {
      toast.error(result.error || "Something went wrong");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Model" : "Create New Model"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-name">Name *</Label>
                <Input
                  id="model-name"
                  placeholder="e.g., Sarah Beach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-description">Description</Label>
                <Textarea
                  id="model-description"
                  placeholder="Describe this AI model persona..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Section 2: Reference Images */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Reference Images</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Images
                </Button>
              </div>

              {selectedImages.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {selectedImages.map((image) => (
                    <div
                      key={image.id}
                      className="relative h-20 w-20 rounded-md overflow-hidden border group"
                    >
                      <img
                        src={image.signed_url}
                        alt={image.filename}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(image.id)}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed p-6">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      No reference images selected
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {selectedImages.length} of 10 images selected. Pick from your
                Asset Library.
              </p>
            </div>

            <Separator />

            {/* Section 3: Voice Settings */}
            <div className="space-y-4">
              <Label>Voice Settings</Label>

              <div className="space-y-2">
                <Label htmlFor="voice-id" className="text-xs">
                  ElevenLabs Voice ID
                </Label>
                <Input
                  id="voice-id"
                  placeholder="e.g., EXAVITQu4vr4xnSDxMaL"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find voice IDs in your ElevenLabs dashboard
                </p>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Voice Parameters</h4>

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
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Create Model"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested picker dialog */}
      <ReferenceImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedIds={selectedImages.map((img) => img.id)}
        onConfirm={handlePickerConfirm}
      />
    </>
  );
}

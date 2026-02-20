"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  ImageIcon,
  Upload,
  X,
  Sparkles,
  Search,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPromptsAction,
  saveLibraryPromptAction,
  updateLibraryPromptAction,
  deletePromptAction,
} from "@/app/dashboard/tools/prompts/actions";
import { getAssetsAction } from "@/app/dashboard/assets/actions";
import type { PromptWithSourceImage, AssetWithUrl } from "@/types";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "pose", label: "Pose" },
  { value: "outfit", label: "Outfit" },
  { value: "background", label: "Background" },
  { value: "expression", label: "Expression" },
  { value: "general", label: "General" },
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface PromptLibraryProps {
  videoType: "dancing_reel" | "talking_head";
  title: string;
}

export function PromptLibrary({ videoType, title }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<PromptWithSourceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPromptText, setNewPromptText] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickerImages, setPickerImages] = useState<AssetWithUrl[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<string>("general");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [editAnalyzing, setEditAnalyzing] = useState(false);
  const [editShowImagePicker, setEditShowImagePicker] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    const result = await getPromptsAction({
      video_type: videoType,
      category: category !== "all" ? category : undefined,
      limit: 100,
    });
    setPrompts(result.prompts);
    setLoading(false);
  }, [videoType, category]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const fetchPickerImages = async () => {
    setPickerLoading(true);
    const result = await getAssetsAction({
      file_type: "image",
      search: pickerSearch || undefined,
      sort_by: "created_at",
      sort_order: "desc",
      limit: 50,
    });
    setPickerImages(result.assets);
    setPickerLoading(false);
  };

  useEffect(() => {
    if (showImagePicker || editShowImagePicker) {
      fetchPickerImages();
    }
  }, [showImagePicker, editShowImagePicker, pickerSearch]);

  const handleFileSelect = (file: File, isEdit: boolean = false) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported format. Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isEdit) {
        setEditImageFile(file);
        setEditImagePreview(preview);
        setEditImageUrl("");
      } else {
        setNewImageFile(file);
        setNewImagePreview(preview);
        setNewImageUrl("");
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (
    imagePreview: string,
    imageFile: File | null,
    isEdit: boolean = false
  ) => {
    const setAnalyzingState = isEdit ? setEditAnalyzing : setAnalyzing;
    const setPromptText = isEdit ? setEditText : setNewPromptText;

    setAnalyzingState(true);
    try {
      let base64 = imagePreview;

      if (imagePreview.startsWith("http")) {
        const res = await fetch(imagePreview);
        const blob = await res.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (base64.startsWith("data:")) {
        base64 = base64.split(",")[1];
      }

      const response = await fetch("/api/prompts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          image_base64: base64,
          content_type: imageFile?.type || "image/jpeg",
          variation_count: 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Analysis failed");
        return;
      }

      const data = await response.json();
      const generatedPrompt: string = data.prompts?.[0] || data.prompt || "";

      if (generatedPrompt) {
        setPromptText(generatedPrompt);
        toast.success("Prompt generated from image!");
      } else {
        toast.error("No prompt generated");
      }
    } catch (error) {
      toast.error("Failed to analyze image");
    } finally {
      setAnalyzingState(false);
    }
  };

  const handlePickerSelect = (asset: AssetWithUrl, isEdit: boolean = false) => {
    if (isEdit) {
      setEditImageFile(null);
      setEditImagePreview(asset.signed_url);
      setEditImageUrl(asset.signed_url);
      setEditShowImagePicker(false);
    } else {
      setNewImageFile(null);
      setNewImagePreview(asset.signed_url);
      setNewImageUrl(asset.signed_url);
      setShowImagePicker(false);
    }
  };

  const handleCopy = async (prompt: PromptWithSourceImage) => {
    await navigator.clipboard.writeText(prompt.prompt_text);
    setCopiedId(prompt.id);
    toast.success("Prompt copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetAddDialog = () => {
    setNewPromptText("");
    setNewCategory("general");
    setNewImageUrl("");
    setNewImageFile(null);
    setNewImagePreview("");
  };

  const handleAdd = async () => {
    if (!newPromptText.trim()) {
      toast.error("Please enter or generate a prompt");
      return;
    }

    setSaving(true);

    let finalImageUrl = newImageUrl;

    if (newImageFile && newImagePreview) {
      try {
        const formData = new FormData();
        formData.append("file", newImageFile);
        formData.append("tags", JSON.stringify(["prompt-library", videoType]));

        const uploadRes = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.asset?.signed_url) {
          finalImageUrl = uploadData.asset.signed_url;
        }
      } catch {
        console.warn("Failed to upload image");
      }
    }

    const result = await saveLibraryPromptAction({
      prompt_text: newPromptText,
      video_type: videoType,
      category: newCategory as "pose" | "outfit" | "background" | "expression" | "general",
      preview_image_url: finalImageUrl || undefined,
    });

    setSaving(false);

    if (result.success) {
      toast.success("Prompt added!");
      setShowAddDialog(false);
      resetAddDialog();
      fetchPrompts();
    } else {
      toast.error(result.error || "Failed to add prompt");
    }
  };

  const handleEdit = (prompt: PromptWithSourceImage) => {
    setEditingId(prompt.id);
    setEditText(prompt.prompt_text);
    setEditCategory(prompt.category || "general");
    setEditImageUrl(prompt.preview_image_url || "");
    setEditImagePreview(prompt.preview_image_url || "");
    setEditImageFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;

    setSaving(true);

    let finalImageUrl = editImageUrl;

    if (editImageFile && editImagePreview) {
      try {
        const formData = new FormData();
        formData.append("file", editImageFile);
        formData.append("tags", JSON.stringify(["prompt-library", videoType]));

        const uploadRes = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.asset?.signed_url) {
          finalImageUrl = uploadData.asset.signed_url;
        }
      } catch {
        console.warn("Failed to upload image");
      }
    }

    const result = await updateLibraryPromptAction(editingId, {
      prompt_text: editText,
      category: editCategory as "pose" | "outfit" | "background" | "expression" | "general",
      preview_image_url: finalImageUrl || undefined,
    });

    setSaving(false);

    if (result.success) {
      toast.success("Prompt updated!");
      setEditingId(null);
      fetchPrompts();
    } else {
      toast.error(result.error || "Failed to update prompt");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deletePromptAction(id);
    if (result.success) {
      toast.success("Prompt deleted");
      fetchPrompts();
    } else {
      toast.error(result.error || "Failed to delete prompt");
    }
  };

  const renderImageSection = (
    imagePreview: string,
    imageFile: File | null,
    isEdit: boolean = false
  ) => {
    const showPicker = isEdit ? editShowImagePicker : showImagePicker;
    const setShowPicker = isEdit ? setEditShowImagePicker : setShowImagePicker;
    const setImagePreview = isEdit ? setEditImagePreview : setNewImagePreview;
    const setImageFile = isEdit ? setEditImageFile : setNewImageFile;
    const setImageUrl = isEdit ? setEditImageUrl : setNewImageUrl;
    const setPromptText = isEdit ? setEditText : setNewPromptText;
    const isAnalyzing = isEdit ? editAnalyzing : analyzing;

    return (
      <div className="space-y-2">
        <Label>Reference Image</Label>

        {imagePreview ? (
          <div className="relative flex gap-3 items-start rounded-md p-3 bg-muted/30">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-24 w-24 rounded-md object-cover"
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">
                {imageFile?.name || "Selected from library"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeImage(imagePreview, imageFile, isEdit)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImagePreview("");
                    setImageFile(null);
                    setImageUrl("");
                    setPromptText("");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-20 flex-col gap-1"
              onClick={() => setShowPicker(true)}
            >
              <FolderOpen className="h-5 w-5" />
              <span className="text-xs">From Library</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-20 flex-col gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">Upload</span>
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file, isEdit);
            e.target.value = "";
          }}
          className="hidden"
        />

        <Dialog open={showPicker} onOpenChange={setShowPicker}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Image</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {pickerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pickerImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No images found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pb-2">
                  {pickerImages.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-md border-2 border-transparent hover:border-accent-blue/50 transition-all"
                      onClick={() => handlePickerSelect(image, isEdit)}
                    >
                      <img
                        src={image.signed_url}
                        alt={image.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetAddDialog();
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Prompt
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No prompts yet</p>
          <p className="text-sm mt-1">
            Add your first prompt to build your {title.toLowerCase()} library
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-card/50 transition-colors"
            >
              {prompt.preview_image_url ? (
                <img
                  src={prompt.preview_image_url}
                  alt="Preview"
                  className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {prompt.category || "general"}
                  </Badge>
                </div>
                <p className="text-sm line-clamp-3">{prompt.prompt_text}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopy(prompt)}
                >
                  {copiedId === prompt.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(prompt)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(prompt.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {title} Prompt</DialogTitle>
            <DialogDescription>
              Select an image and AI will generate a prompt you can edit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {renderImageSection(newImagePreview, newImageFile, false)}

            <div className="space-y-2">
              <Label>Prompt Text</Label>
              <Textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="AI will generate this from your image, or type manually..."
                rows={6}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Edit the AI-generated prompt or write your own.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={saving || analyzing || !newPromptText.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Prompt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderImageSection(editImagePreview, editImageFile, true)}

            <div className="space-y-2">
              <Label>Prompt Text</Label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving || editAnalyzing || !editText.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getPromptsAction,
  saveLibraryPromptAction,
  updateLibraryPromptAction,
  deletePromptAction,
} from "@/app/dashboard/tools/prompts/actions";
import type { PromptWithSourceImage } from "@/types";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "pose", label: "Pose" },
  { value: "outfit", label: "Outfit" },
  { value: "background", label: "Background" },
  { value: "expression", label: "Expression" },
  { value: "general", label: "General" },
] as const;

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
  const [newPreviewUrl, setNewPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<string>("general");
  const [editPreviewUrl, setEditPreviewUrl] = useState("");

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

  const handleCopy = async (prompt: PromptWithSourceImage) => {
    await navigator.clipboard.writeText(prompt.prompt_text);
    setCopiedId(prompt.id);
    toast.success("Prompt copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdd = async () => {
    if (!newPromptText.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setSaving(true);
    const result = await saveLibraryPromptAction({
      prompt_text: newPromptText,
      video_type: videoType,
      category: newCategory as "pose" | "outfit" | "background" | "expression" | "general",
      preview_image_url: newPreviewUrl || undefined,
    });

    setSaving(false);

    if (result.success) {
      toast.success("Prompt added!");
      setShowAddDialog(false);
      setNewPromptText("");
      setNewCategory("general");
      setNewPreviewUrl("");
      fetchPrompts();
    } else {
      toast.error(result.error || "Failed to add prompt");
    }
  };

  const handleEdit = (prompt: PromptWithSourceImage) => {
    setEditingId(prompt.id);
    setEditText(prompt.prompt_text);
    setEditCategory(prompt.category || "general");
    setEditPreviewUrl(prompt.preview_image_url || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    setSaving(true);
    const result = await updateLibraryPromptAction(editingId, {
      prompt_text: editText,
      category: editCategory as "pose" | "outfit" | "background" | "expression" | "general",
      preview_image_url: editPreviewUrl || undefined,
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
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
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
              Add a proven prompt you can reuse for image generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <Label>Prompt Text</Label>
              <Textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="Describe the pose, outfit, setting, etc..."
                rows={6}
                className="resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Preview Image URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                value={newPreviewUrl}
                onChange={(e) => setNewPreviewUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Paste a URL to an example image for visual reference.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={saving || !newPromptText.trim()}>
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
              <Label>
                Preview Image URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                value={editPreviewUrl}
                onChange={(e) => setEditPreviewUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
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

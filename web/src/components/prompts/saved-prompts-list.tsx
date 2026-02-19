"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  updatePromptAction,
  deletePromptAction,
} from "@/app/dashboard/tools/prompts/actions";
import type { PromptWithSourceImage } from "@/types";

interface SavedPromptsListProps {
  prompts: PromptWithSourceImage[];
  onPromptsChange: () => void;
}

export function SavedPromptsList({
  prompts,
  onPromptsChange,
}: SavedPromptsListProps) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIds((prev) => new Set(prev).add(id));
    setJustCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setJustCopiedId(null), 2000);
  };

  const handleEdit = (prompt: PromptWithSourceImage) => {
    setEditingId(prompt.id);
    setEditText(prompt.prompt_text);
    setExpandedId(prompt.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const result = await updatePromptAction(editingId, editText);
    if (result.success) {
      toast.success("Prompt updated");
      onPromptsChange();
    } else {
      toast.error(result.error);
    }
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deletePromptAction(deleteId);
    if (result.success) {
      toast.success("Prompt deleted");
      onPromptsChange();
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (prompts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Prompts</h3>
        <p className="text-xs text-muted-foreground">
          {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Compact card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prompts.map((prompt) => {
          const isExpanded = expandedId === prompt.id;
          const isEditing = editingId === prompt.id;
          const wasCopied = copiedIds.has(prompt.id);
          const justCopied = justCopiedId === prompt.id;
          const previewText =
            prompt.prompt_text.length > 80
              ? prompt.prompt_text.slice(0, 80) + "..."
              : prompt.prompt_text;

          return (
            <div
              key={prompt.id}
              className={`rounded-lg overflow-hidden transition-all duration-200 ${
                wasCopied
                  ? "bg-green-950/30 ring-1 ring-green-800"
                  : "bg-card text-card-foreground border border-border hover:bg-[oklch(0.11_0_0)]"
              }`}
            >
              {/* Card header — thumbnail + meta + actions */}
              <div className="flex items-start gap-3 p-3">
                {/* Source image thumbnail or placeholder */}
                <div className="flex-shrink-0">
                  {prompt.source_image?.signed_url ? (
                    <img
                      src={prompt.source_image.signed_url}
                      alt="Source"
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {previewText}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(prompt.created_at)}
                    </span>
                    {prompt.variation_label && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1 py-0 h-4"
                      >
                        {prompt.variation_label}
                      </Badge>
                    )}
                    {prompt.is_edited && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 text-amber-600"
                      >
                        Edited
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {/* Copy — always visible */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(prompt.id, prompt.prompt_text);
                    }}
                    title={wasCopied ? "Copied — click to copy again" : "Copy prompt"}
                  >
                    {justCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : wasCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Expand/collapse */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => toggleExpand(prompt.id)}
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Overflow menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEdit(prompt)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(prompt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expanded content — full prompt text or edit textarea */}
              {isExpanded && (
                <div className="border-t px-3 pb-3 pt-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="text-xs font-mono"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {prompt.prompt_text}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prompt? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

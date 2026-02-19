"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, FolderInput, X, Loader2 } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  aiModels: { id: string; name: string }[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onBulkAssignModel: (modelId: string | null) => void;
  downloading: boolean;
  deleting: boolean;
  assigning: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  aiModels,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onBulkAssignModel,
  downloading,
  deleting,
  assigning,
}: BulkActionBarProps) {
  // Key to force-remount the Select after each assignment (so it resets to placeholder)
  const [selectKey, setSelectKey] = useState(0);

  if (selectedCount === 0) return null;

  const isProcessing = downloading || deleting || assigning;

  const handleAssign = (value: string) => {
    const modelId = value === "__unassign__" ? null : value;
    onBulkAssignModel(modelId);
    // Reset select so the same model can be picked again
    setSelectKey((k) => k + 1);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
      {/* Count + select all / clear */}
      <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
        <span>{selectedCount} selected</span>
        {selectedCount < totalCount && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={onSelectAll}
          >
            Select all {totalCount}
          </Button>
        )}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Download */}
      <Button
        variant="outline"
        size="sm"
        onClick={onBulkDownload}
        disabled={isProcessing}
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        Download
      </Button>

      {/* Assign to Model */}
      {aiModels.length > 0 && (
        <Select
          key={selectKey}
          onValueChange={handleAssign}
          disabled={isProcessing}
        >
          <SelectTrigger className="w-[180px] h-8">
            {assigning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4" />
            )}
            <SelectValue placeholder="Assign to Model" />
          </SelectTrigger>
          <SelectContent position="popper" side="top" align="start">
            <SelectItem value="__unassign__">Remove from Model</SelectItem>
            {aiModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isProcessing}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} asset{selectedCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} selected asset
              {selectedCount > 1 ? "s" : ""} from storage. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedCount} asset{selectedCount > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close selection */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

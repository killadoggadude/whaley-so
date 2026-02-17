"use client";

import { Button } from "@/components/ui/button";
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
import { Trash2, X, Loader2 } from "lucide-react";

interface ReelBulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  deleting: boolean;
}

export function ReelBulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  deleting,
}: ReelBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-background/95 backdrop-blur px-4 py-3 shadow-lg">
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

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleting}
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
              Delete {selectedCount} reel{selectedCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedCount} saved reel
              {selectedCount > 1 ? "s" : ""} from your library. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedCount} reel{selectedCount > 1 ? "s" : ""}
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

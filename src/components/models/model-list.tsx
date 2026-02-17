"use client";

import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { ModelCard } from "@/components/models/model-card";
import { ModelFormDialog } from "@/components/models/model-form-dialog";
import { Plus, UserCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getModelsAction,
  deleteModelAction,
  toggleModelActiveAction,
} from "@/app/dashboard/models/actions";
import type { AiModelWithImages } from "@/types";

interface ModelListProps {
  initialModels: AiModelWithImages[];
}

export function ModelList({ initialModels }: ModelListProps) {
  const [models, setModels] = useState<AiModelWithImages[]>(initialModels);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModelWithImages | null>(
    null
  );

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetchModels = async () => {
    const result = await getModelsAction();
    if (!result.error) {
      setModels(result.models);
    }
  };

  const handleCreate = () => {
    setEditingModel(null);
    setFormOpen(true);
  };

  const handleEdit = (model: AiModelWithImages) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    const result = await deleteModelAction(deletingId);
    if (result.success) {
      setModels((prev) => prev.filter((m) => m.id !== deletingId));
      toast.success("Model deleted");
    } else {
      toast.error(result.error);
    }

    setDeleteConfirmOpen(false);
    setDeletingId(null);
  };

  const handleToggleActive = async (id: string) => {
    const result = await toggleModelActiveAction(id);
    if (result.success) {
      setModels((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_active: !m.is_active } : m
        )
      );
    } else {
      toast.error(result.error);
    }
  };

  const deletingModel = models.find((m) => m.id === deletingId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Model
        </Button>
      </div>

      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <UserCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No AI models yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first AI model profile to get started
          </p>
          <Button onClick={handleCreate} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create Model
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Create / Edit form dialog */}
      <ModelFormDialog
        key={editingModel?.id ?? "create"}
        model={editingModel}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={refetchModels}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingModel?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

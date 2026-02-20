"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle, MoreVertical, Pencil, Trash2, Power, Mic } from "lucide-react";
import type { AiModelWithImages } from "@/types";

interface ModelCardProps {
  model: AiModelWithImages;
  onEdit: (model: AiModelWithImages) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

export function ModelCard({
  model,
  onEdit,
  onDelete,
  onToggleActive,
}: ModelCardProps) {
  const firstImage = model.reference_images[0];

  return (
    <Card
      className="cursor-pointer overflow-hidden border border-border bg-card hover:bg-card-hover hover:border-primary/30 transition-all duration-200"
      onClick={() => onEdit(model)}
    >
      <CardHeader className="p-0">
        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
          {firstImage ? (
            <img
              src={firstImage.signed_url}
              alt={model.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserCircle className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          {model.reference_images.length > 1 && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 text-xs"
            >
              +{model.reference_images.length - 1} images
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">{model.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(model);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive(model.id);
                }}
              >
                <Power className="h-4 w-4 mr-2" />
                {model.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(model.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {model.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {model.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0 gap-2 flex-wrap">
        <Badge variant={model.is_active ? "default" : "secondary"} className="text-xs">
          {model.is_active ? "Active" : "Inactive"}
        </Badge>
        {model.voice_id && (
          <Badge variant="outline" className="text-xs gap-1">
            <Mic className="h-3 w-3" />
            Voice set
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

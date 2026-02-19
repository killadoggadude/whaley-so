"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { saveApiKeyAction, deleteApiKeyAction } from "@/app/dashboard/settings/actions";
import type { ApiService, MaskedApiKey } from "@/types";
import { toast } from "sonner";

const SERVICE_LABELS: Record<ApiService, string> = {
  elevenlabs: "ElevenLabs",
  higgsfield: "Higgsfield",
  wavespeed: "Wavespeed",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT-4o)",
  google: "Google AI (Gemini)",
};

interface ApiKeyCardProps {
  service: ApiService;
  existing?: MaskedApiKey;
}

export function ApiKeyCard({ service, existing }: ApiKeyCardProps) {
  const [editing, setEditing] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!newKey.trim()) return;
    setLoading(true);
    const result = await saveApiKeyAction(service, newKey);
    setLoading(false);

    if (result.success) {
      toast.success(`${SERVICE_LABELS[service]} API key saved`);
      setEditing(false);
      setNewKey("");
    } else {
      toast.error(result.error || "Failed to save");
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteApiKeyAction(service);
    setLoading(false);

    if (result.success) {
      toast.success(`${SERVICE_LABELS[service]} API key removed`);
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-card border border-border p-4 transition-colors duration-200 hover:bg-[oklch(0.11_0_0)]">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium">{SERVICE_LABELS[service]}</p>
          {existing ? (
            <p className="text-xs text-muted-foreground font-mono">
              {existing.masked_key}
            </p>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Not configured
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="password"
              placeholder="Paste API key..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-64 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={loading || !newKey.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setNewKey("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {existing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={loading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

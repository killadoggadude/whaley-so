"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface PromptResultCardProps {
  prompt: string;
  onPromptChange: (newText: string) => void;
}

export function PromptResultCard({
  prompt,
  onPromptChange,
}: PromptResultCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(prompt);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onPromptChange(editText);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(prompt);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <span className="text-sm font-medium">Scene Recreation Prompt</span>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditText(prompt);
                  setEditing(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={12}
            className="text-sm font-mono"
            autoFocus
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {prompt}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  Sparkles,
  Wand2,
  Copy,
  Check,
  RefreshCw,
  FileText,
  X,
  ThumbsUp,
  Archive,
  ArchiveX,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ScriptCategory } from "./page";

interface Script {
  id: string;
  script_text: string;
  category: string;
  is_ai_generated: boolean;
  created_at: string;
  upvotes_count?: number;
  has_upvoted?: boolean;
  is_archived?: boolean;
  archived_at?: string;
}

interface ScriptsClientProps {
  initialScripts: Script[];
  categories: readonly { value: string; label: string }[];
}

export function ScriptsClient({
  initialScripts,
  categories,
}: ScriptsClientProps) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [total, setTotal] = useState(initialScripts.length);
  const [upvoting, setUpvoting] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  // New script dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newScriptText, setNewScriptText] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general");
  const [saving, setSaving] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [humanizedText, setHumanizedText] = useState<string | null>(null);

  // AI Generate dialog
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("flirty");
  const [generating, setGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<string[]>([]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch scripts
  const fetchScripts = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      offsetRef.current = 0;
      hasMoreRef.current = true;
    }
    
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      params.set("status", status);
      params.set("limit", "50");
      params.set("offset", offsetRef.current.toString());

      const res = await fetch(`/api/scripts/list?${params}`);
      const data = await res.json();

      if (res.ok) {
        if (isLoadMore) {
          setScripts((prev) => [...prev, ...data.scripts]);
        } else {
          setScripts(data.scripts);
        }
        setTotal(data.total);
        hasMoreRef.current = data.scripts.length === 50;
        offsetRef.current += data.scripts.length;
      }
    } catch (error) {
      console.error("Fetch scripts error:", error);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [category, search, status]);

  // Initial load and filter changes
  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMoreRef.current && !loading) {
          fetchScripts(true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadingMore, loading, fetchScripts]);

  // Upvote script
  const handleUpvote = async (scriptId: string) => {
    setUpvoting(scriptId);
    try {
      const res = await fetch(`/api/scripts/upvote?script_id=${scriptId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        setScripts((prev) =>
          prev.map((s) =>
            s.id === scriptId
              ? {
                  ...s,
                  has_upvoted: data.upvoted,
                  upvotes_count: (s.upvotes_count || 0) + (data.upvoted ? 1 : -1),
                }
              : s
          )
        );
      }
    } catch (error) {
      console.error("Upvote error:", error);
    } finally {
      setUpvoting(null);
    }
  };

  // Archive/Unarchive script
  const handleArchive = async (scriptId: string, archive: boolean) => {
    setArchiving(scriptId);
    try {
      const endpoint = archive ? "/api/scripts/archive" : "/api/scripts/unarchive";
      const res = await fetch(`${endpoint}?script_id=${scriptId}`, {
        method: "POST",
      });

      if (res.ok) {
        if (archive) {
          toast.success("Script marked as used");
        } else {
          toast.success("Script restored");
        }
        fetchScripts();
      }
    } catch (error) {
      console.error("Archive error:", error);
    } finally {
      setArchiving(null);
    }
  };

  // Humanize text
  const handleHumanize = async () => {
    if (!newScriptText.trim()) return;

    setHumanizing(true);
    try {
      const res = await fetch("/api/scripts/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newScriptText }),
      });

      const data = await res.json();

      if (res.ok) {
        setHumanizedText(data.humanized);
        if (data.detectedPatterns.length > 0) {
          toast.info(`Found ${data.detectedPatterns.length} AI patterns`);
        }
      } else {
        toast.error(data.error || "Humanize failed");
      }
    } catch (error) {
      toast.error("Humanize failed");
    } finally {
      setHumanizing(false);
    }
  };

  // Save scripts
  const handleSave = async () => {
    const textToSave = humanizedText || newScriptText;
    if (!textToSave.trim()) return;

    setSaving(true);
    try {
      // Split by newlines - each line is a separate script
      const lines = textToSave
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 5);

      if (lines.length === 0) {
        toast.error("No valid scripts to save");
        return;
      }

      const scriptsToSave = lines.map((script_text) => ({
        script_text,
        category: newCategory,
        is_ai_generated: false,
      }));

      const res = await fetch("/api/scripts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scripts: scriptsToSave }),
      });

      if (res.ok) {
        toast.success(`Saved ${lines.length} script(s)`);
        setShowNewDialog(false);
        setNewScriptText("");
        setHumanizedText(null);
        fetchScripts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Save failed");
      }
    } catch (error) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Generate scripts with AI
  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      toast.error("Add a prompt to generate scripts");
      return;
    }

    setGenerating(true);
    try {
      // Get reference scripts from selected category
      const refScripts = scripts
        .filter((s) => s.category === selectedCategory)
        .slice(0, 5)
        .map((s) => s.script_text);

      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatePrompt,
          referenceScripts: refScripts,
          category: selectedCategory,
          count: 8,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedScripts(data.scripts || []);
        if (data.scripts?.length === 0) {
          toast.warning("No scripts generated");
        }
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch (error) {
      toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Save generated script
  const handleSaveGenerated = async (scriptText: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/scripts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: [
            {
              script_text: scriptText,
              category: selectedCategory,
              is_ai_generated: true,
            },
          ],
        }),
      });

      if (res.ok) {
        toast.success("Script saved");
        fetchScripts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Save failed");
      }
    } catch (error) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Humanize and save generated
  const handleHumanizeGenerated = async (scriptText: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/scripts/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scriptText }),
      });

      const data = await res.json();

      if (res.ok && data.humanized) {
        // Save the humanized version
        const saveRes = await fetch("/api/scripts/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scripts: [
              {
                script_text: data.humanized,
                category: selectedCategory,
                is_ai_generated: true,
              },
            ],
          }),
        });

        if (saveRes.ok) {
          toast.success("Humanized and saved");
          fetchScripts();
        }
      }
    } catch (error) {
      toast.error("Humanize failed");
    } finally {
      setSaving(false);
    }
  };

  // Delete script
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/scripts/delete?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Script deleted");
        fetchScripts();
      }
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts</h1>
          <p className="text-muted-foreground">
            {total} script{total !== 1 ? "s" : ""} in library
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGenerateDialog(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Script
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Status Tabs */}
        <Tabs value={status} onValueChange={(v) => setStatus(v as "active" | "archived")}>
          <TabsList>
            <TabsTrigger value="active">
              <FileText className="h-4 w-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="archived">
              <Archive className="h-4 w-4 mr-2" />
              Used
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Category */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scripts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs
            value={category}
            onValueChange={setCategory}
            className="w-full sm:w-auto"
          >
            <TabsList className="w-full sm:w-auto flex flex-wrap">
              {categories.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Scripts Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No scripts found</p>
          <p className="text-sm">Add your first script or generate one with AI</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-card-hover hover:border-primary/30 hover:shadow-lg transition-all duration-200 card-hover"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {script.category}
                  </Badge>
                  {script.is_ai_generated && (
                    <Badge variant="outline" className="text-xs">
                      AI
                    </Badge>
                  )}
                  {script.is_archived && (
                    <Badge variant="default" className="text-xs bg-primary/10 text-primary border border-primary/20">
                      <Video className="h-3 w-3 mr-1" />
                      Used in video
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(script.created_at)}
                  </span>
                </div>
                <p className="text-sm">{script.script_text}</p>
              </div>
              <div className="flex items-center gap-1">
                {script.is_archived ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleArchive(script.id, false)}
                    disabled={archiving === script.id}
                    title="Restore script"
                  >
                    <ArchiveX className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      script.has_upvoted && "text-primary"
                    )}
                    onClick={() => handleUpvote(script.id)}
                    disabled={upvoting === script.id}
                  >
                    <ThumbsUp className={cn("h-4 w-4", script.has_upvoted && "fill-current")} />
                  </Button>
                )}
                {(script.upvotes_count || 0) > 0 && (
                  <span className="text-xs text-muted-foreground min-w-[20px] text-center">
                    {script.upvotes_count}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    navigator.clipboard.writeText(script.script_text);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setDeletingId(script.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* New Script Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Script</DialogTitle>
            <DialogDescription>
              Enter your script text. Each line will be saved as a separate
              script.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newCategory}
                onValueChange={setNewCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.value !== "all")
                    .map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Script Text</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHumanize}
                  disabled={humanizing || !newScriptText.trim()}
                >
                  {humanizing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-1" />
                  )}
                  Humanize
                </Button>
              </div>
              <Textarea
                value={newScriptText}
                onChange={(e) => {
                  setNewScriptText(e.target.value);
                  setHumanizedText(null);
                }}
                placeholder="Enter script text...&#10;Each line becomes a separate script"
                rows={8}
                className="resize-none"
              />
              {humanizedText && (
                <div className="space-y-2">
                  <Label className="text-green-600">
                    Humanized version:
                  </Label>
                  <Textarea
                    value={humanizedText}
                    onChange={(e) => setHumanizedText(e.target.value)}
                    rows={6}
                    className="resize-none text-green-600"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tip: Click "Humanize" to remove AI writing patterns before
                saving.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewDialog(false);
                  setNewScriptText("");
                  setHumanizedText(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !newScriptText.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Script{saving ? "..." : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate AI Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Scripts with AI</DialogTitle>
            <DialogDescription>
              Generate new scripts similar to your existing ones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.value !== "all")
                    .map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                What kind of scripts do you want?{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="E.g., Make them more teasing, include a confession, make them catchier..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                The AI will use your existing {selectedCategory} scripts as
                reference.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Scripts
            </Button>

            {/* Generated Scripts */}
            {generatedScripts.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <Label>Generated Scripts:</Label>
                {generatedScripts.map((script, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 rounded-md bg-muted"
                  >
                    <p className="flex-1 text-sm">{script}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(script);
                          toast.success("Copied!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleHumanizeGenerated(script)}
                        disabled={saving}
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSaveGenerated(script)}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Script?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

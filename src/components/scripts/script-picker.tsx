"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Search,
  FileText,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Script {
  id: string;
  script_text: string;
  category: string;
  is_ai_generated: boolean;
  created_at: string;
  upvotes_count?: number;
  has_upvoted?: boolean;
}

interface ScriptPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usedScriptIds: string[];
  onSelect: (script: Script) => void;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "flirty", label: "Flirty" },
  { value: "confession", label: "Confession" },
  { value: "teaser", label: "Teaser" },
  { value: "story", label: "Story" },
  { value: "question", label: "Question" },
  { value: "challenge", label: "Challenge" },
  { value: "general", label: "General" },
] as const;

export function ScriptPicker({
  open,
  onOpenChange,
  usedScriptIds,
  onSelect,
}: ScriptPickerProps) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (!open) return;

    const fetchScripts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (search) params.set("search", search);
        params.set("limit", "100");

        const res = await fetch(`/api/scripts/list?${params}`);
        const data = await res.json();

        if (res.ok) {
          setScripts(data.scripts || []);
        }
      } catch (error) {
        console.error("Fetch scripts error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScripts();
  }, [open, category, search]);

  const handleClick = (script: Script) => {
    if (usedScriptIds.includes(script.id)) return;
    onSelect(script);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Script Library
          </DialogTitle>
          <DialogDescription>
            Click on a script to select it. Used scripts are disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
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
            className="w-full"
          >
            <TabsList className="w-full flex flex-wrap h-auto gap-1">
              {CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.value}
                  value={cat.value}
                  className="text-xs px-2 py-1"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <ScrollArea className="h-[calc(85vh-220px)]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scripts found</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {scripts.map((script) => {
                  const isUsed = usedScriptIds.includes(script.id);

                  return (
                    <div
                      key={script.id}
                      onClick={() => handleClick(script)}
                      className={cn(
                        "relative p-3 rounded-lg border bg-card transition-all cursor-pointer",
                        isUsed
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:border-primary/30 hover:bg-card-hover"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {script.category}
                            </Badge>
                            {script.is_ai_generated && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                AI
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(script.created_at)}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{script.script_text}</p>
                        </div>
                        {isUsed && (
                          <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { Script };

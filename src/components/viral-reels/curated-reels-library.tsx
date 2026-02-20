"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Video,
  Music,
  Clapperboard,
  Plus,
  Lock,
  Sparkles,
  ExternalLink,
  Crown,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCuratedReelsAction,
  addCuratedReelAction,
} from "@/app/dashboard/viral-reels/actions";
import type { ViralReel, ReelCategory } from "@/types";

const CATEGORIES = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "talking_head", label: "Talking Head", icon: Video },
  { value: "dancing", label: "Dancing", icon: Music },
  { value: "motion_control", label: "Motion Control", icon: Clapperboard },
] as const;

const ADMIN_EMAIL = "tobias@thirst.so";

interface CuratedReelsLibraryProps {
  isAdmin: boolean;
}

export function CuratedReelsLibrary({ isAdmin }: CuratedReelsLibraryProps) {
  const [reels, setReels] = useState<ViralReel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addCategory, setAddCategory] = useState<ReelCategory>("talking_head");
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const [selectedReel, setSelectedReel] = useState<ViralReel | null>(null);

  const fetchReels = useCallback(async () => {
    setLoading(true);
    const result = await getCuratedReelsAction({
      category: category !== "all" ? category : undefined,
      limit: 100,
    });
    setReels(result.reels);
    setTotal(result.total);
    setIsPaid(result.isPaid || false);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  const handleAddReel = async () => {
    if (!addUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setAdding(true);
    const result = await addCuratedReelAction({
      url: addUrl,
      category: addCategory,
      notes: addNotes,
    });

    setAdding(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Reel added to library!");
      setShowAddDialog(false);
      setAddUrl("");
      setAddNotes("");
      fetchReels();
    }
  };

  const getRecreateHref = (reel: ViralReel) => {
    switch (reel.category) {
      case "talking_head":
        return "/dashboard/tools/talking-head";
      case "dancing":
        return "/dashboard/tools/dancing-reel";
      case "motion_control":
        return "/dashboard/tools/motion-control";
      default:
        return "/dashboard/tools/talking-head";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tabs value={category} onValueChange={setCategory} className="w-auto">
            <TabsList>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="gap-1.5">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-sm text-muted-foreground">
            {total} viral reel{total !== 1 ? "s" : ""}
          </span>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Reel
          </Button>
        )}
      </div>

      {!isPaid && !isAdmin && (
        <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium">Upgrade to unlock all viral reels</p>
              <p className="text-sm text-muted-foreground">
                Get unlimited access to our curated library of viral inspiration
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/settings">Upgrade Now</Link>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No viral reels yet</p>
          <p className="text-sm mt-1">
            {isAdmin ? "Add your first reel to start building the library" : "Check back soon for viral inspiration"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {reels.map((reel, index) => {
            const isBlurred = !isPaid && !isAdmin && index >= 3;

            return (
              <div
                key={reel.id}
                className={cn(
                  "group relative aspect-[9/16] rounded-lg overflow-hidden border border-border bg-muted cursor-pointer transition-all",
                  isBlurred && "blur-lg brightness-75"
                )}
                onClick={() => !isBlurred && setSelectedReel(reel)}
              >
                {reel.thumbnail_url ? (
                  <img
                    src={`/api/viral-reels/stored-thumbnail?path=${encodeURIComponent(reel.thumbnail_url)}`}
                    alt="Reel thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {reel.notes || "Click to view details"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-white/70 text-xs">
                      <span>{reel.category}</span>
                      {reel.view_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatViews(reel.view_count)} views</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isPaid && !isAdmin && reels.length > 3 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {total - 3} more reel{total - 3 !== 1 ? "s" : ""} available for premium users
            </span>
            <Button size="sm" variant="default" className="ml-2" asChild>
              <Link href="/dashboard/settings">Upgrade</Link>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Viral Reel</DialogTitle>
            <DialogDescription>
              Add a reel to the curated library for all users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={addCategory} onValueChange={(v) => setAddCategory(v as ReelCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="talking_head">Talking Head</SelectItem>
                  <SelectItem value="dancing">Dancing</SelectItem>
                  <SelectItem value="motion_control">Motion Control</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Why is this viral? What makes it work?"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={adding}>
                Cancel
              </Button>
              <Button onClick={handleAddReel} disabled={adding || !addUrl.trim()}>
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Reel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReel} onOpenChange={(open) => !open && setSelectedReel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Viral Reel Details</DialogTitle>
          </DialogHeader>
          {selectedReel && (
            <div className="space-y-4">
              {selectedReel.thumbnail_url && (
                <img
                  src={`/api/viral-reels/stored-thumbnail?path=${encodeURIComponent(selectedReel.thumbnail_url)}`}
                  alt="Reel"
                  className="w-full aspect-video object-cover rounded-lg"
                />
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium">{selectedReel.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Views:</span>
                  <span className="ml-2 font-medium">{formatViews(selectedReel.view_count)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Added:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedReel.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="ml-2 font-medium capitalize">{selectedReel.platform}</span>
                </div>
              </div>
              {selectedReel.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1">{selectedReel.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={selectedReel.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Original
                  </a>
                </Button>
                <Button className="flex-1" asChild>
                  <Link href={getRecreateHref(selectedReel)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Recreate
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

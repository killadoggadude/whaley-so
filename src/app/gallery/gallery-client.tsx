"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/layout/footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Video,
  Music,
  Clapperboard,
  Sparkles,
  Lock,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import type { GalleryItem, GalleryVideoType } from "@/types";

interface GalleryClientProps {
  initialItems: GalleryItem[];
  initialTotal: number;
  initialType: string;
}

const VIDEO_TYPES = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "talking_head", label: "Talking Head", icon: Video },
  { value: "dancing", label: "Dancing", icon: Music },
  { value: "motion_control", label: "Motion Control", icon: Clapperboard },
] as const;

export function GalleryClient({
  initialItems,
  initialTotal,
  initialType,
}: GalleryClientProps) {
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(initialType);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== "all") params.set("video_type", type);
      params.set("limit", "50");
      params.set("sort", "newest");

      const res = await fetch(`/api/gallery/list?${params}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Fetch gallery error:", error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const getVideoTypeLabel = (vt: GalleryVideoType) => {
    return VIDEO_TYPES.find((t) => t.value === vt)?.label || vt;
  };

  const getRemakeHref = (item: GalleryItem) => {
    switch (item.video_type) {
      case "talking_head":
        return `/dashboard/tools/talking-head`;
      case "dancing":
        return `/dashboard/tools/dancing-reel`;
      case "motion_control":
        return `/dashboard/tools/motion-control`;
      default:
        return `/dashboard`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/thirst-so-logo.png" alt="thirst.so" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">Community Gallery</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover videos created by our community. Click any video to recreate it with your own twist.
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Tabs value={type} onValueChange={setType} className="w-auto">
            <TabsList>
              {VIDEO_TYPES.map((vt) => (
                <TabsTrigger key={vt.value} value={vt.value} className="gap-1.5">
                  <vt.icon className="h-4 w-4" />
                  {vt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <span className="text-sm text-muted-foreground">
            {total} video{total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No videos yet</p>
            <p className="text-sm mt-1">Be the first to create and share!</p>
            <Button className="mt-4" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative aspect-[9/16] rounded-lg overflow-hidden border border-border bg-muted hover:border-primary/50 transition-all text-left"
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {item.script_text || "Click to view details"}
                    </p>
                    <p className="text-white/70 text-xs mt-1">
                      {getVideoTypeLabel(item.video_type)}
                    </p>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recreate This Video</DialogTitle>
          </DialogHeader>
            {selectedItem && (
            <div className="space-y-4">
              {selectedItem.thumbnail_url && (
                <img
                  src={selectedItem.thumbnail_url}
                  alt="Video"
                  className="w-full aspect-video object-cover rounded-lg"
                  loading="lazy"
                />
              )}
              {selectedItem.script_text && (
                <div>
                  <p className="text-sm font-medium mb-1">Script</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.script_text}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Type: {getVideoTypeLabel(selectedItem.video_type)}</span>
                <span>Views: {selectedItem.views}</span>
                <span>Remakes: {selectedItem.remakes}</span>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" asChild>
                  <Link href={getRemakeHref(selectedItem)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Recreate This Video
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Sign in to recreate this video with your own model
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer variant="public" />
    </div>
  );
}

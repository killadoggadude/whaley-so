import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

import {
  Video,
  Music,
  Clapperboard,
  Flame,
  FileText,
  Sparkles,
  FolderOpen,
  UserCircle,
  LayoutGrid,
  ArrowRight,
  Plus,
  Play,
  Eye,
  MessageCircle,
  Wand2,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    title: "Talking Head",
    description: "Create a talking head video from any image",
    href: "/dashboard/tools/talking-head",
    icon: Video,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Dancing Reel",
    description: "Make your model dance to any beat",
    href: "/dashboard/tools/dancing-reel",
    icon: Music,
    color: "bg-pink-500/10 text-pink-500",
  },
  {
    title: "Motion Control",
    description: "Recreate any pose or movement",
    href: "/dashboard/tools/motion-control",
    icon: Clapperboard,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    title: "Viral Reels",
    description: "Discover trending reels for inspiration",
    href: "/dashboard/viral-reels",
    icon: Flame,
    color: "bg-orange-500/10 text-orange-500",
  },
];

const libraryItems = [
  { title: "Assets", href: "/dashboard/assets", icon: FolderOpen },
  { title: "Models", href: "/dashboard/models", icon: UserCircle },
  { title: "Scripts", href: "/dashboard/tools/scripts", icon: FileText },
  { title: "Prompts", href: "/dashboard/tools/prompts", icon: Sparkles },
  { title: "Gallery", href: "/gallery", icon: LayoutGrid },
  { title: "Transcribe", href: "/dashboard/tools/transcribe", icon: Mic },
  { title: "TTS", href: "/dashboard/tools/tts", icon: Wand2 },
];

async function getCuratedViralReels() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("viral_reels")
    .select("id, url, platform, thumbnail_url, notes, view_count, created_at")
    .eq("is_curated", true)
    .order("created_at", { ascending: false })
    .limit(6);
  return data || [];
}

async function getTrendingGallery() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery")
    .select("id, video_type, thumbnail_url, views, remakes, created_at, user_id")
    .eq("is_public", true)
    .order("remakes", { ascending: false })
    .limit(6);
  return data || [];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single();

  const [viralReels, trendingGallery] = await Promise.all([
    getCuratedViralReels(),
    getTrendingGallery(),
  ]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            Welcome back{profile?.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to create something amazing today?
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Plan:{" "}
            <span className="font-medium text-foreground capitalize">
              {profile?.subscription_tier ?? "free"}
            </span>
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200 hover:shadow-lg card-hover"
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {action.description}
              </p>
              <ArrowRight className="absolute top-5 right-4 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Viral Reels Section */}
      {viralReels.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Viral This Week</h2>
            <Link
              href="/dashboard/viral-reels"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {viralReels.map((reel) => (
              <Link
                key={reel.id}
                href="/dashboard/viral-reels"
                className="group relative aspect-[9/16] rounded-lg overflow-hidden border border-border bg-muted hover:border-primary/50 transition-all"
              >
                {reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail_url}
                    alt={reel.notes || "Viral reel"}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Play className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-medium line-clamp-2">
                      {reel.notes || "Tap to view"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/70 text-xs capitalize">
                        {reel.platform}
                      </span>
                      {reel.view_count > 0 && (
                        <span className="text-white/70 text-xs flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {reel.view_count >= 1000000
                            ? `${(reel.view_count / 1000000).toFixed(1)}M`
                            : reel.view_count >= 1000
                            ? `${(reel.view_count / 1000).toFixed(1)}K`
                            : reel.view_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Community Gallery Section */}
      {trendingGallery.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Trending from Community</h2>
            <Link
              href="/gallery"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {trendingGallery.map((item) => (
              <Link
                key={item.id}
                href={`/gallery?remake=${item.id}`}
                className="group relative aspect-[9/16] rounded-lg overflow-hidden border border-border bg-muted hover:border-primary/50 transition-all"
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt="Gallery video"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-white/70 text-xs capitalize bg-white/20 px-2 py-0.5 rounded">
                      {item.video_type?.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.views || 0}
                      </span>
                      <span className="text-white/70 text-xs flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {item.remakes || 0}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Library */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Library</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {libraryItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 group"
            >
              <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium text-sm">{item.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Mobile Quick Create */}
      <section className="sm:hidden">
        <h2 className="text-lg font-semibold mb-4">Create New</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.slice(0, 4).map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              asChild
            >
              <Link href={action.href}>
                <action.icon className="h-5 w-5" />
                <span className="text-sm">{action.title}</span>
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

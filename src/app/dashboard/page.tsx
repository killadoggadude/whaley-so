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
  Play,
  Eye,
  MessageCircle,
  Wand2,
  Mic,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    .limit(4);
  return data || [];
}

async function getTrendingGallery() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery")
    .select("id, video_type, thumbnail_url, script_text, views, remakes, created_at, user_id")
    .eq("is_public", true)
    .order("remakes", { ascending: false })
    .limit(4);
  return data || [];
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function getViewCountTier(count: number): { label: string; color: string } | null {
  if (count === 0) return null;
  if (count >= 1000000) return { label: "1M+", color: "bg-purple-600" };
  if (count >= 500000) return { label: "500K+", color: "bg-blue-600" };
  if (count >= 100000) return { label: "100K+", color: "bg-green-600" };
  return { label: "100K+", color: "bg-yellow-600" };
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {viralReels.map((reel) => {
              const tier = getViewCountTier(reel.view_count || 0);
              return (
                <div
                  key={reel.id}
                  className="group relative overflow-hidden rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
                >
                  {/* Thumbnail */}
                  <a
                    href={reel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-[9/16] bg-muted"
                  >
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.notes || "Viral reel"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <div className="rounded-full bg-white/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>

                    {/* Platform badge */}
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur px-2 py-1 text-white text-[10px] capitalize">
                        {reel.platform}
                      </div>
                    </div>

                    {/* View count badge */}
                    <div className="absolute bottom-2 left-2">
                      {tier ? (
                        <Badge className={`text-xs backdrop-blur text-white border-none ${tier.color} h-6 px-2`}>
                          {tier.label}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-gray-600 backdrop-blur text-white border-none h-6 px-2">
                          {formatViewCount(reel.view_count || 0)} views
                        </Badge>
                      )}
                    </div>
                  </a>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    {reel.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {reel.notes}
                      </p>
                    )}
                    <Button size="sm" className="w-full" asChild>
                      <a href={reel.url} target="_blank" rel="noopener noreferrer">
                        <SparklesIcon className="h-3.5 w-3.5 mr-1" />
                        Recreate
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trendingGallery.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
              >
                {/* Thumbnail */}
                <Link
                  href={`/gallery?remake=${item.id}`}
                  className="block relative aspect-[9/16] bg-muted"
                >
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt="Gallery video"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="rounded-full bg-white/90 p-3 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play className="h-6 w-6 text-black fill-black" />
                    </div>
                  </div>

                  {/* Video type badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-[10px] capitalize bg-white/20 backdrop-blur text-white border-none">
                      {item.video_type?.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-white text-[10px] bg-black/60 backdrop-blur px-1.5 py-0.5 rounded">
                      <Eye className="h-3 w-3" />
                      {formatViewCount(item.views || 0)}
                    </span>
                    <span className="flex items-center gap-1 text-white text-[10px] bg-black/60 backdrop-blur px-1.5 py-0.5 rounded">
                      <MessageCircle className="h-3 w-3" />
                      {item.remakes || 0}
                    </span>
                  </div>
                </Link>

                {/* Info */}
                <div className="p-3 space-y-2">
                  {item.script_text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.script_text}
                    </p>
                  )}
                  <Button size="sm" className="w-full" asChild>
                    <Link href={`/gallery?remake=${item.id}`}>
                      <SparklesIcon className="h-3.5 w-3.5 mr-1" />
                      Recreate
                    </Link>
                  </Button>
                </div>
              </div>
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

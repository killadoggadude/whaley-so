import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
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
];

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

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
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

      {/* Library */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Library</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

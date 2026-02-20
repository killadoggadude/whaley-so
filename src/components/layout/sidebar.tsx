"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  FolderOpen,
  UserCircle,
  Sparkles,
  Flame,
  Video,
  Music,
  Clapperboard,
  FileText,
  LayoutGrid,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "Overview",
  },
  {
    title: "Viral Reels",
    href: "/dashboard/viral-reels",
    icon: Flame,
    group: "Overview",
  },
  {
    title: "Gallery",
    href: "/gallery",
    icon: LayoutGrid,
    group: "Overview",
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    icon: FolderOpen,
    group: "Library",
  },
  {
    title: "Models",
    href: "/dashboard/models",
    icon: UserCircle,
    group: "Library",
  },
  {
    title: "Scripts",
    href: "/dashboard/tools/scripts",
    icon: FileText,
    group: "Library",
  },
  {
    title: "Prompts",
    href: "/dashboard/tools/prompts",
    icon: Sparkles,
    group: "Video Tools",
  },
  {
    title: "Talking Head",
    href: "/dashboard/tools/talking-head",
    icon: Video,
    group: "Video Tools",
  },
  {
    title: "Dancing Reel",
    href: "/dashboard/tools/dancing-reel",
    icon: Music,
    group: "Video Tools",
  },
  {
    title: "Motion Control",
    href: "/dashboard/tools/motion-control",
    icon: Clapperboard,
    group: "Video Tools",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    group: "System",
  },
];

const groupOrder = ["Overview", "Library", "Video Tools", "System"];

export function Sidebar() {
  const pathname = usePathname();

  const groupedItems = groupOrder.map((group) => ({
    group,
    items: navItems.filter((item) => item.group === group),
  }));

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="block">
          <img src="/thirst-so-logo.png" alt="thirst.so" className="h-8 w-auto" />
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4 flex-1">
        {groupedItems.map(({ group, items }) => (
          <div key={group} className="mb-4 last:mb-0">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              {group}
            </h3>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                        : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

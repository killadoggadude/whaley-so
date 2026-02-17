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
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    icon: FolderOpen,
  },
  {
    title: "AI Models",
    href: "/dashboard/models",
    icon: UserCircle,
  },
  {
    title: "Prompts",
    href: "/dashboard/tools/prompts",
    icon: Sparkles,
  },
  {
    title: "Viral Reels",
    href: "/dashboard/viral-reels",
    icon: Flame,
  },
  {
    title: "Talking Head",
    href: "/dashboard/tools/talking-head",
    icon: Video,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-sidebar min-h-[calc(100vh-57px)]">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
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
      </nav>
    </aside>
  );
}

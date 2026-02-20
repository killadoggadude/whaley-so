import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <img src="/thirst-so-logo.png" alt="thirst.so" className="h-8 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

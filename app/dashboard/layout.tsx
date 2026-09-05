import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VocauraLogo } from "@/components/vocaura-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";

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
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* App Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <VocauraLogo />
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/practice"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Practice
              </Link>
              <Link
                href="/progress"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Progress
              </Link>
              <Link
                href="/mistakes"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Mistakes
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/50">
              {user.email}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span>Vocaura — Professional English Trainer</span>
          <span className="font-mono text-[11px]">Phase 1 Active</span>
        </div>
      </footer>
    </div>
  );
}

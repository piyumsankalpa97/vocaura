import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsView } from "./settings-view";
import { Settings } from "lucide-react";

export const metadata = {
  title: "Settings | Vocaura",
  description: "Account settings, AI evaluation preferences, and data management.",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, role, created_at, goals")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Settings size={15} className="text-primary" />
            Preferences & System
          </div>
        }
        title="Account & Settings"
        description="Manage your profile, speaking focus, AI evaluation providers, and audio privacy preferences."
      />

      <SettingsView userEmail={user?.email || "user@vocaura.local"} profile={profile} />
    </div>
  );
}

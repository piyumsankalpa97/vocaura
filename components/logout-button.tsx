"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/login");
  };

  return (
    <Button
      onClick={logout}
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground text-xs gap-1.5 font-medium"
    >
      <LogOut size={14} />
      Sign out
    </Button>
  );
}

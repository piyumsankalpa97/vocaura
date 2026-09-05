import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { VocauraLogo } from "@/components/vocaura-logo";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if profile already exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full p-6 flex justify-between items-center border-b border-border/80 bg-background/85 backdrop-blur-md">
        <VocauraLogo />
      </header>
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome to Vocaura
            </h1>
            <p className="text-muted-foreground text-sm">
              Let's set up your profile to personalize your practice scenarios.
            </p>
          </div>
          
          <div className="p-6 sm:p-8 rounded-xl border border-border bg-card shadow-sm">
            <OnboardingForm />
          </div>
        </div>
      </main>
    </div>
  );
}

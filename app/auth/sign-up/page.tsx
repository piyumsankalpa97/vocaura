import { SignUpForm } from "@/components/sign-up-form";
import { VocauraLogo } from "@/components/vocaura-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-background">
      <div className="flex items-center justify-between w-full max-w-sm mx-auto">
        <VocauraLogo />
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-sm mx-auto my-auto">
        <SignUpForm />
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        Vocaura — Calm, focused professional communication
      </div>
    </div>
  );
}

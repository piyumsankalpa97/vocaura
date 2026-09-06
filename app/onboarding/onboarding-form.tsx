"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";

const GOAL_OPTIONS = [
  "Improve overall fluency",
  "Prepare for job interviews",
  "Build confidence in meetings",
  "Expand professional vocabulary",
  "Prepare for language tests"
];

export function OnboardingForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [professionalContext, setProfessionalContext] = useState("");
  const [confidence, setConfidence] = useState("5");

  const handleGoalToggle = (goal: string) => {
    setGoals((current) =>
      current.includes(goal)
        ? current.filter((g) => g !== goal)
        : [...current, goal]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !role) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          display_name: displayName,
          role: role,
          goals: goals,
          professional_context: professionalContext,
          confidence_self_rating: parseInt(confidence, 10),
        });

      if (insertError) {
        throw insertError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred while creating your profile.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm font-medium text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name <span className="text-destructive">*</span></Label>
          <Input
            id="display-name"
            placeholder="How should we call you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Professional Role <span className="text-destructive">*</span></Label>
          <Select value={role} onValueChange={setRole} disabled={isLoading} required>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select your primary role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Software Engineer">Software Engineer</SelectItem>
              <SelectItem value="Nurse">Nurse</SelectItem>
              <SelectItem value="General Professional">General Professional</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            This helps Vocaura choose relevant practice scenarios.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="professional-context">Preferred Practice Context (Optional)</Label>
          <Input
            id="professional-context"
            placeholder="e.g. ICU, Frontend Development, Client Meetings"
            value={professionalContext}
            onChange={(e) => setProfessionalContext(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label>Primary Goals</Label>
          <div className="grid gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <div key={goal} className="flex items-center space-x-2">
                <Checkbox
                  id={`goal-${goal}`}
                  checked={goals.includes(goal)}
                  onCheckedChange={() => handleGoalToggle(goal)}
                  disabled={isLoading}
                />
                <label
                  htmlFor={`goal-${goal}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {goal}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="confidence">Current Spoken English Confidence (1-10)</Label>
          <Select value={confidence} onValueChange={setConfidence} disabled={isLoading}>
            <SelectTrigger id="confidence">
              <SelectValue placeholder="Select confidence level" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} - {num === 1 ? "Very Anxious" : num === 10 ? "Highly Confident" : "Moderate"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !displayName || !role}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating profile...
          </>
        ) : (
          "Complete Profile"
        )}
      </Button>
    </form>
  );
}

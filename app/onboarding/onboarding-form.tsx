"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

  // Personal vocabulary states
  const [locations, setLocations] = useState<string[]>(["Colombo", "Gampaha"]);
  const [people, setPeople] = useState<string[]>([]);
  const [workTerms, setWorkTerms] = useState<string[]>([]);

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

      // Insert initial personal vocabulary
      const allVocabItems: Array<{ user_id: string; entity: string; category: string }> = [
        ...locations.map((loc) => ({ user_id: user.id, entity: loc.trim(), category: "Location" })),
        ...people.map((p) => ({ user_id: user.id, entity: p.trim(), category: "Person" })),
        ...workTerms.map((w) => ({ user_id: user.id, entity: w.trim(), category: "Workplace" })),
      ].filter((item) => item.entity.length > 0);

      // user_vocabulary is unique on (user_id, entity), so keep the first occurrence
      // of each entity or Postgres rejects the whole upsert.
      const vocabItems = allVocabItems.filter(
        (item, index) => allVocabItems.findIndex((other) => other.entity === item.entity) === index
      );

      if (vocabItems.length > 0) {
        const { error: vocabError } = await supabase
          .from("user_vocabulary")
          .upsert(vocabItems, { onConflict: "user_id,entity" });
        // Vocabulary is optional and editable in Settings, so don't block onboarding.
        if (vocabError) {
          console.error("Failed to save initial vocabulary:", vocabError);
        }
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

        {/* Personal Vocabulary Section */}
        <div className="pt-4 border-t border-border space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Personal Vocabulary (Optional)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add local Sri Lankan places, names, or workplaces you frequently mention so Vocaura can correct them if the transcription mishears them.
            </p>
          </div>

          <VocabularyChipInput
            label="Frequent Locations (Cities, Towns)"
            placeholder="e.g. Colombo, Gampaha, Kandy (press Enter)"
            items={locations}
            onAdd={(val) => setLocations((prev) => Array.from(new Set([...prev, val])))}
            onRemove={(val) => setLocations((prev) => prev.filter((item) => item !== val))}
            disabled={isLoading}
          />

          <VocabularyChipInput
            label="People / Family / Colleague Names"
            placeholder="e.g. Aloka, Sethma, Nimal (press Enter)"
            items={people}
            onAdd={(val) => setPeople((prev) => Array.from(new Set([...prev, val])))}
            onRemove={(val) => setPeople((prev) => prev.filter((item) => item !== val))}
            disabled={isLoading}
          />

          <VocabularyChipInput
            label="Workplace, University, or Organizations"
            placeholder="e.g. Sysco, SLIIT, WSO2, Asiri (press Enter)"
            items={workTerms}
            onAdd={(val) => setWorkTerms((prev) => Array.from(new Set([...prev, val])))}
            onRemove={(val) => setWorkTerms((prev) => prev.filter((item) => item !== val))}
            disabled={isLoading}
          />
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

function VocabularyChipInput({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  disabled,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
  disabled?: boolean;
}) {
  const [inputVal, setInputVal] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = inputVal.trim().replace(/^,|,$/g, "");
      if (trimmed) {
        onAdd(trimmed);
        setInputVal("");
      }
    }
  };

  const handleBlur = () => {
    const trimmed = inputVal.trim().replace(/^,|,$/g, "");
    if (trimmed) {
      onAdd(trimmed);
      setInputVal("");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 rounded-lg border border-input bg-background/50 focus-within:ring-1 focus-within:ring-ring">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="text-xs py-0.5 px-2 flex items-center gap-1 font-normal bg-accent text-accent-foreground"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              disabled={disabled}
              className="text-muted-foreground hover:text-foreground font-bold text-xs leading-none"
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={items.length === 0 ? placeholder : "Add another..."}
          disabled={disabled}
          className="flex-1 min-w-[140px] bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none px-1 py-0.5"
        />
      </div>
    </div>
  );
}

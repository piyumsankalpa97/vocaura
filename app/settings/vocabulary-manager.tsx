"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookA, Loader2, Save, Undo2, X, CheckCircle2 } from "lucide-react";
import { updateUserVocabulary, VocabularyItem } from "@/app/actions/vocabulary";

const KNOWN_CATEGORIES = ["Location", "Person", "Workplace"];

interface VocabularyManagerProps {
  initialItems: VocabularyItem[];
}

export function VocabularyManager({ initialItems }: VocabularyManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<VocabularyItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; text: string } | null>(null);

  const hasChanges = useMemo(() => {
    if (items.length !== initialItems.length) return true;
    const sortedInitial = [...initialItems].sort((a, b) => a.entity.localeCompare(b.entity));
    const sortedCurrent = [...items].sort((a, b) => a.entity.localeCompare(b.entity));
    return JSON.stringify(sortedInitial) !== JSON.stringify(sortedCurrent);
  }, [initialItems, items]);

  const handleAdd = (entity: string, category: string) => {
    setItems((prev) => {
      // One row per entity (unique per user), regardless of category
      if (prev.some((item) => item.entity.toLowerCase() === entity.toLowerCase())) {
        return prev;
      }
      return [...prev, { entity, category }];
    });
    setSaveStatus(null);
  };

  const handleRemove = (entity: string, category?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        if (item.entity !== entity) return true;
        // No category means the "Other Terms" list: match any non-standard category.
        return category ? item.category !== category : KNOWN_CATEGORIES.includes(item.category);
      })
    );
    setSaveStatus(null);
  };

  const handleDiscard = () => {
    setItems(initialItems);
    setSaveStatus(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUserVocabulary(items);
      if (result.success) {
        setSaveStatus({ success: true, text: "Vocabulary saved successfully." });
        router.refresh(); // Sync initialItems from server
      } else {
        setSaveStatus({ success: false, text: result.error || "Failed to save." });
      }
    });
  };

  const getItemsByCategory = (cat: string) => items.filter((i) => i.category === cat).map((i) => i.entity);
  const otherItems = items.filter((i) => !KNOWN_CATEGORIES.includes(i.category)).map((i) => i.entity);

  return (
    <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <BookA size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Personal Vocabulary</h2>
          <p className="text-xs text-muted-foreground">Manage local places, names, and organizations so Vocaura can correct them when the transcription mishears them.</p>
        </div>
      </div>

      <div className="space-y-6 pt-2">
        <VocabularyChipInput
          label="Frequent Locations (Cities, Towns)"
          placeholder="e.g. Colombo, Gampaha, Kandy (press Enter)"
          items={getItemsByCategory("Location")}
          onAdd={(val) => handleAdd(val, "Location")}
          onRemove={(val) => handleRemove(val, "Location")}
          disabled={isPending}
        />

        <VocabularyChipInput
          label="People / Family / Colleague Names"
          placeholder="e.g. Aloka, Sethma, Nimal (press Enter)"
          items={getItemsByCategory("Person")}
          onAdd={(val) => handleAdd(val, "Person")}
          onRemove={(val) => handleRemove(val, "Person")}
          disabled={isPending}
        />

        <VocabularyChipInput
          label="Workplace, University, or Organizations"
          placeholder="e.g. Sysco, SLIIT, WSO2 (press Enter)"
          items={getItemsByCategory("Workplace")}
          onAdd={(val) => handleAdd(val, "Workplace")}
          onRemove={(val) => handleRemove(val, "Workplace")}
          disabled={isPending}
        />

        <VocabularyChipInput
          label="Other Terms"
          placeholder="e.g. Terms saved from transcript review (press Enter)"
          items={otherItems}
          onAdd={(val) => handleAdd(val, "Other")}
          onRemove={(val) => handleRemove(val)}
          disabled={isPending}
        />
      </div>

      {(hasChanges || saveStatus) && (
        <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
          <div>
             {saveStatus && (
               <div className={`text-xs font-medium flex items-center gap-1.5 ${saveStatus.success ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                 {saveStatus.success ? <CheckCircle2 size={14} /> : <X size={14} />}
                 {saveStatus.text}
               </div>
             )}
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={isPending}
                  className="text-xs gap-1.5"
                >
                  <Undo2 size={14} />
                  Discard Changes
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="text-xs gap-1.5"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Vocabulary
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
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
      <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg border border-input bg-background/50 focus-within:ring-1 focus-within:ring-ring">
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

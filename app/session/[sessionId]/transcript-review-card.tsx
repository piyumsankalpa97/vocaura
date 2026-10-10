"use client";

import { useState } from "react";
import {
  splitTextByCorrections,
  TranscriptCorrection,
} from "@/lib/ai/optimization-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw, Check, Edit3, X, Loader2, Info } from "lucide-react";

interface TranscriptReviewCardProps {
  originalText: string;
  initialCorrections: TranscriptCorrection[];
  onConfirm: (corrections: TranscriptCorrection[]) => void;
  isSubmitting: boolean;
}

export function TranscriptReviewCard({
  originalText,
  initialCorrections,
  onConfirm,
  isSubmitting,
}: TranscriptReviewCardProps) {
  const [corrections, setCorrections] = useState<TranscriptCorrection[]>(initialCorrections);

  // Active word editor modal state
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [replacementVal, setReplacementVal] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Location");

  // Active review of existing correction modal state
  const [selectedCorrection, setSelectedCorrection] = useState<TranscriptCorrection | null>(null);

  // Click on an uncorrected word (already stripped of leading/trailing punctuation)
  const handleWordClick = (word: string) => {
    if (!word || isSubmitting) return;
    setEditingWord(word);
    setReplacementVal(word);
    setSelectedCategory("Location");
  };

  // Save manual word correction
  const handleSaveCorrection = () => {
    if (!editingWord || !replacementVal.trim()) return;

    if (replacementVal.trim() !== editingWord) {
      const newCorrection: TranscriptCorrection = {
        original: editingWord,
        corrected: replacementVal.trim(),
        category: selectedCategory,
        reason: "User manual adjustment",
      };

      setCorrections((prev) => [
        ...prev.filter((c) => c.original.toLowerCase() !== editingWord.toLowerCase()),
        newCorrection,
      ]);
    }

    setEditingWord(null);
    setReplacementVal("");
  };

  // Remove a correction
  const handleRemoveCorrection = (orig: string) => {
    setCorrections((prev) =>
      prev.filter((c) => c.original.toLowerCase() !== orig.toLowerCase())
    );
    setSelectedCorrection(null);
  };

  // Same matcher the server uses to apply corrections, so what is highlighted
  // here (including multi-word phrases) is exactly what will be replaced.
  const pieces = splitTextByCorrections(originalText, corrections);

  return (
    <div className="rounded-2xl bg-card border border-primary/30 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Review Your Transcript
              <Badge variant="outline" className="text-[10px] font-medium border-primary/40 text-primary">
                {initialCorrections.length > 0
                  ? `${initialCorrections.length} suggested fix${initialCorrections.length === 1 ? "" : "es"}`
                  : "No suggested fixes"}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Check highlighted names and places, and click any word Whisper misheard. Analysis starts when you confirm.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onConfirm(corrections)}
          disabled={isSubmitting}
          className="text-xs h-8 gap-1.5 shrink-0"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check size={13} />
              Confirm &amp; Analyze
            </>
          )}
        </Button>
      </div>

      {/* Transcript Text Canvas with Interactive Words */}
      <div className="p-5 rounded-xl bg-accent/20 border border-border/70 leading-relaxed text-base select-none">
        {pieces.map((piece, pieceIndex) => {
          const correction = piece.correction;
          if (correction) {
            return (
              <button
                key={pieceIndex}
                type="button"
                onClick={() => setSelectedCorrection(correction)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer"
                title={`Whisper heard: "${piece.text}". Click to review.`}
              >
                <span>{correction.corrected}</span>
                <Edit3 size={10} className="opacity-70" />
              </button>
            );
          }

          return piece.text.split(/(\s+)/).map((token, tokenIndex) => {
            const key = `${pieceIndex}-${tokenIndex}`;
            if (!token || /^\s+$/.test(token)) {
              return <span key={key}>{token}</span>;
            }

            // Separate leading/trailing punctuation from the clickable word
            const match = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
            const leadingPunct = match ? match[1] : "";
            const coreWord = match ? match[2] : token;
            const trailingPunct = match ? match[3] : "";

            if (!coreWord) {
              return <span key={key}>{token}</span>;
            }

            return (
              <span key={key}>
                {leadingPunct}
                <button
                  type="button"
                  onClick={() => handleWordClick(coreWord)}
                  disabled={isSubmitting}
                  className="hover:bg-primary/10 hover:text-primary rounded px-0.5 transition-colors cursor-pointer"
                  title="Click to correct this word"
                >
                  {coreWord}
                </button>
                {trailingPunct}
              </span>
            );
          });
        })}
      </div>

      {/* Active Corrections Summary Chips */}
      {corrections.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Corrections to apply ({corrections.length}):</span>
            <span className="text-[11px] text-muted-foreground">Click × to revert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {corrections.map((corr, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs py-1 px-2.5 bg-background border border-border flex items-center gap-2 font-normal"
              >
                <span className="line-through text-muted-foreground font-mono">{corr.original}</span>
                <span className="text-primary font-bold font-mono">→ {corr.corrected}</span>
                <span className="text-[10px] text-muted-foreground uppercase bg-secondary px-1.5 py-0.2 rounded">
                  {corr.category || "Location"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveCorrection(corr.original)}
                  disabled={isSubmitting}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  title="Revert this correction"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Modal / Popover: Correct Unrecognized Word */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-lg animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Adjust Word</h4>
              <p className="text-xs text-muted-foreground">
                Whisper heard &quot;<span className="font-mono text-foreground font-semibold">{editingWord}</span>&quot;. Enter the intended word.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="replacement" className="text-xs">
                  Intended Word (Proper Noun / Name)
                </Label>
                <Input
                  id="replacement"
                  value={replacementVal}
                  onChange={(e) => setReplacementVal(e.target.value)}
                  placeholder="e.g. Gampaha, Aloka"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveCorrection();
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <div className="flex gap-2">
                  {["Location", "Person", "Workplace", "Other"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingWord(null);
                  setReplacementVal("");
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCorrection}
                disabled={!replacementVal.trim()}
                className="text-xs"
              >
                Apply Correction
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Popover: Review Existing Correction */}
      {selectedCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full space-y-4 shadow-lg animate-in zoom-in-95 duration-200">
            <div>
              <h4 className="text-sm font-semibold text-foreground">AI Word Correction</h4>
              <p className="text-xs text-muted-foreground">
                Review this substitution before proceeding to evaluation.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Original heard:</span>
                <span className="font-mono font-semibold text-foreground">{selectedCorrection.original}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Corrected to:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedCorrection.corrected}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category:</span>
                <span className="text-foreground">{selectedCorrection.category || "Location"}</span>
              </div>
              {selectedCorrection.reason && (
                <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                  Reason: {selectedCorrection.reason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveCorrection(selectedCorrection.original)}
                className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
              >
                <RotateCcw size={12} />
                Revert to Original
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedCorrection(null)}
                className="text-xs"
              >
                Keep Correction
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Notice */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
        <Info size={13} className="shrink-0 text-primary" />
        <span>
          Confirmed names are saved to your Personal Vocabulary so future transcripts are corrected automatically.
        </span>
      </div>
    </div>
  );
}

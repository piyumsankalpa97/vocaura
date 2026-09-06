"use client";

import { useState, useTransition, useMemo } from "react";
import { MistakeRecord, toggleMistakeResolved } from "@/app/actions/mistakes";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";
import Link from "next/link";

interface MistakeListViewProps {
  initialMistakes: MistakeRecord[];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MistakeListView({ initialMistakes }: MistakeListViewProps) {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(initialMistakes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "resolved" | "all">("active");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Available unique types from user's mistakes
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of mistakes) {
      if (m.type) types.add(m.type.toLowerCase());
    }
    return Array.from(types);
  }, [mistakes]);

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      // 1. Status filter
      if (statusFilter === "active" && m.resolved) return false;
      if (statusFilter === "resolved" && !m.resolved) return false;

      // 2. Type filter
      if (selectedType !== "all" && m.type?.toLowerCase() !== selectedType) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesKey = m.canonical_key?.toLowerCase().includes(query);
        const matchesIncorrect = m.incorrect_example?.toLowerCase().includes(query);
        const matchesCorrected = m.corrected_example?.toLowerCase().includes(query);
        const matchesExplanation = m.explanation?.toLowerCase().includes(query);
        return matchesKey || matchesIncorrect || matchesCorrected || matchesExplanation;
      }

      return true;
    });
  }, [mistakes, statusFilter, selectedType, searchQuery]);

  const handleToggleResolved = (mistakeId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await toggleMistakeResolved(mistakeId);
      if (res.success && res.resolved !== undefined) {
        setMistakes((prev) =>
          prev.map((m) => (m.id === mistakeId ? { ...m, resolved: res.resolved! } : m))
        );
      } else {
        setActionError(res.error || "Failed to update mistake status");
      }
    });
  };

  const activeCount = mistakes.filter((m) => !m.resolved).length;
  const resolvedCount = mistakes.filter((m) => m.resolved).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by mistake, phrase, or explanation..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-card border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Status Toggle Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/60 self-start sm:self-auto text-xs">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "active"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "resolved"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({mistakes.length})
          </button>
        </div>
      </div>

      {/* Type Filter Pills */}
      {availableTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
            <Filter size={12} /> Type:
          </span>
          <button
            onClick={() => setSelectedType("all")}
            className={`px-2.5 py-1 rounded-lg border text-xs capitalize transition-colors ${
              selectedType === "all"
                ? "bg-primary text-primary-foreground border-primary font-medium"
                : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Types
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded-lg border text-xs capitalize transition-colors ${
                selectedType === type
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {actionError}
        </div>
      )}

      {/* Mistake Items List */}
      {filteredMistakes.length > 0 ? (
        <div className="space-y-3">
          {filteredMistakes.map((mistake) => (
            <div
              key={mistake.id}
              className={`p-5 rounded-2xl border transition-all ${
                mistake.resolved
                  ? "bg-card/40 border-border/50 opacity-75"
                  : "bg-card border-border/80 shadow-sm hover:border-border"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/50">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-secondary text-foreground capitalize">
                    {mistake.type}
                  </span>

                  <span
                    className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                      mistake.severity === "high"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                        : mistake.severity === "medium"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border/60"
                    }`}
                  >
                    {mistake.severity || "medium"}
                  </span>

                  <span className="font-mono text-xs text-muted-foreground">
                    {mistake.canonical_key}
                  </span>

                  {mistake.resolved && (
                    <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      Resolved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="font-semibold text-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                    {mistake.occurrence_count}{" "}
                    {mistake.occurrence_count === 1 ? "occurrence" : "occurrences"}
                  </span>
                  <span>Last seen: {formatRelativeTime(mistake.last_seen_at)}</span>
                </div>
              </div>

              {/* Before and After Phrasing */}
              <div className="py-4 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {mistake.incorrect_example && (
                    <div className="space-y-1 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Observed usage:
                      </span>
                      <span className="line-through text-muted-foreground font-mono">
                        &quot;{mistake.incorrect_example}&quot;
                      </span>
                    </div>
                  )}

                  {mistake.corrected_example && (
                    <div className="space-y-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <ArrowRight size={10} />
                        Recommended correction:
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        &quot;{mistake.corrected_example}&quot;
                      </span>
                    </div>
                  )}
                </div>

                {mistake.explanation && (
                  <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                    {mistake.explanation}
                  </p>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleResolved(mistake.id)}
                  disabled={isPending}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {mistake.resolved ? (
                    <>
                      <RotateCcw size={13} />
                      Re-open Mistake
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                      Mark as Resolved
                    </>
                  )}
                </Button>

                <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                  <Link href="/practice">
                    <Sparkles size={12} className="text-primary" />
                    Practice This
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 rounded-2xl border border-border/80 bg-card text-center space-y-3">
          <Layers size={36} className="mx-auto text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-foreground">
            {statusFilter === "resolved"
              ? "No resolved mistakes yet"
              : searchQuery.trim() || selectedType !== "all"
              ? "No mistakes match your filters"
              : "No recurring mistakes tracked yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {statusFilter === "resolved"
              ? "When you overcome recurring communication patterns, mark them as resolved to celebrate your growth."
              : searchQuery.trim() || selectedType !== "all"
              ? "Try clearing your search query or selecting 'All Types' to see your complete list."
              : "As you complete practice sessions, Gemini automatically identifies persistent grammar, preposition, and vocabulary patterns."}
          </p>
          {(searchQuery.trim() || selectedType !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
              }}
              className="text-xs mt-2"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Clock, ArrowRight, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role_scope?: string[];
}

export interface Prompt {
  id: string;
  category_id: string;
  role_scope: string[];
  difficulty: number;
  title: string;
  prompt: string;
  context: string;
  expected_skills: string[];
  estimated_minutes: number;
  active: boolean;
  practice_categories?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface PracticeCatalogViewProps {
  initialCategories: Category[];
  initialPrompts: Prompt[];
  userRole?: string;
}

export function PracticeCatalogView({
  initialCategories,
  initialPrompts,
  userRole = "Software Engineer",
}: PracticeCatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyRecommended, setOnlyRecommended] = useState<boolean>(false);

  // Normalize user role for matching
  const normalizedUserRole = userRole.toLowerCase().trim();

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return initialPrompts.filter((prompt) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = prompt.title.toLowerCase().includes(query);
        const matchesContext = prompt.context?.toLowerCase().includes(query) || false;
        const matchesPrompt = prompt.prompt?.toLowerCase().includes(query) || false;
        const matchesSkills = prompt.expected_skills?.some((s) =>
          s.toLowerCase().includes(query)
        ) || false;

        if (!matchesTitle && !matchesContext && !matchesPrompt && !matchesSkills) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== "all") {
        if (prompt.category_id !== selectedCategory) {
          return false;
        }
      }

      // 3. Role Recommendation Filter
      if (onlyRecommended) {
        const roleScope = prompt.role_scope?.map((r) => r.toLowerCase()) || [];
        const matchesRole =
          roleScope.includes(normalizedUserRole) ||
          roleScope.some((r) => normalizedUserRole.includes(r) || r.includes(normalizedUserRole)) ||
          roleScope.includes("general") ||
          roleScope.includes("general workplace");

        if (!matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [initialPrompts, searchQuery, selectedCategory, onlyRecommended, normalizedUserRole]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialPrompts.length };
    initialPrompts.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [initialPrompts]);

  const getDifficultyBadge = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Foundational
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Intermediate
          </span>
        );
      case 3:
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Advanced
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls: Search, Category Tabs, Role Filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search exercises, skills, or scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card border-border text-sm"
          />
        </div>

        {/* Role toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyRecommended(!onlyRecommended)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              onlyRecommended
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:text-foreground border-border"
            }`}
          >
            <Sparkles size={14} />
            <span>Recommended for {userRole}</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
            selectedCategory === "all"
              ? "bg-foreground text-background border-foreground font-semibold"
              : "bg-card text-muted-foreground hover:text-foreground border-border"
          }`}
        >
          All Exercises
          <span className="text-[11px] opacity-75">({categoryCounts.all || 0})</span>
        </button>

        {initialCategories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                isSelected
                  ? "bg-foreground text-background border-foreground font-semibold"
                  : "bg-card text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              {cat.name}
              <span className="text-[11px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Exercise Cards Grid */}
      {filteredPrompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="flex flex-col justify-between p-6 rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="space-y-3.5">
                {/* Meta Row: Category, Difficulty, Duration */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary uppercase tracking-wider text-[11px]">
                      {prompt.practice_categories?.name || "General"}
                    </span>
                    <span className="text-border">•</span>
                    {getDifficultyBadge(prompt.difficulty)}
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Clock size={13} />
                    <span>{prompt.estimated_minutes} min</span>
                  </div>
                </div>

                {/* Prompt Title */}
                <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {prompt.title}
                </h2>

                {/* Context Snippet */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {prompt.context}
                </p>

                {/* Target Skills */}
                {prompt.expected_skills && prompt.expected_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {prompt.expected_skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                    {prompt.expected_skills.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        +{prompt.expected_skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  Spoken Response
                </span>
                <Button asChild size="sm" className="gap-1.5 text-xs font-medium">
                  <Link href={`/practice/${prompt.id}`}>
                    Start Session
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/40 space-y-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Filter size={18} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No practice exercises found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No prompts matched "${searchQuery}". Try a different search term or category.`
              : "No exercises currently match the selected filters."}
          </p>
          {(searchQuery || selectedCategory !== "all" || onlyRecommended) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setOnlyRecommended(false);
              }}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

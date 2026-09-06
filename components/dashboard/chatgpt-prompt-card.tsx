"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatGPTPromptCardProps {
  role: string | null;
  goal: string | null;
  weakness: string | null;
}

export function ChatGPTPromptCard({ role, goal, weakness }: ChatGPTPromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const safeRole = role || "Professional";
  const safeGoal = goal || "improve my spoken English for work";
  const safeWeakness = weakness || "general fluency and filler words";

  const promptText = `You are my professional English conversation coach.

My professional role: ${safeRole}
My main goal: ${safeGoal}
My current weakness: ${safeWeakness}

Start a realistic conversation with me.
Ask one question at a time.
Do not correct every sentence immediately because I need to practice spontaneous speaking.
Challenge me with natural follow-up questions.
After 5 to 7 exchanges, give me feedback on:

1. Grammar
2. Vocabulary
3. Fluency
4. Clarity
5. Professional tone
6. Repeated mistakes
7. One specific exercise for my next session

Keep the conversation realistic rather than academic.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            External Practice Mode
          </h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopy}
          className="text-xs h-8 gap-1.5"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Prompt
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Export a personalized prompt to practice interactive conversation with ChatGPT or Claude. It's customized for your role and current weaknesses.
      </p>

      <div className="rounded-lg border border-border/50 bg-secondary/20 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 text-xs font-medium hover:bg-secondary/40 transition-colors"
        >
          <span className="text-muted-foreground">Preview Prompt</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        
        <div 
          className={cn(
            "px-3 pb-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap transition-all",
            isExpanded ? "block" : "hidden"
          )}
        >
          {promptText}
        </div>
      </div>
    </div>
  );
}

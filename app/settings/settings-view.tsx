"use client";

import { useState } from "react";
import { User, Shield, Cpu, Database, CheckCircle2, AlertTriangle, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsViewProps {
  userEmail: string;
  profile: {
    display_name: string;
    role: string;
    created_at?: string;
    goals?: string[];
  } | null;
}

export function SettingsView({ userEmail, profile }: SettingsViewProps) {
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const handleExportData = () => {
    const data = {
      user: userEmail,
      profile: profile,
      exportedAt: new Date().toISOString(),
      note: "Vocaura MVP Activity Data Export",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocaura-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedNotification("Profile data exported successfully.");
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div className="space-y-8">
      {copiedNotification && (
        <div className="p-3 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={15} />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* 1. Profile & Role */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">User Profile & Track</h2>
            <p className="text-xs text-muted-foreground">Your account details and professional speaking specialization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1.5 p-4 rounded-lg bg-secondary/30 border border-border/40">
            <div className="text-xs font-medium text-muted-foreground">Display Name</div>
            <div className="font-medium text-foreground">{profile?.display_name || "User"}</div>
          </div>

          <div className="space-y-1.5 p-4 rounded-lg bg-secondary/30 border border-border/40">
            <div className="text-xs font-medium text-muted-foreground">Email Address</div>
            <div className="font-medium text-foreground font-mono text-xs sm:text-sm">{userEmail}</div>
          </div>

          <div className="space-y-1.5 p-4 rounded-lg bg-secondary/30 border border-border/40 sm:col-span-2">
            <div className="text-xs font-medium text-muted-foreground">Professional Training Track</div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {profile?.role || "General Professional"}
              </span>
              <span className="text-xs text-muted-foreground">
                Practice prompts and evaluations are customized for this professional context.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI Providers Status */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">AI Intelligence & Processing</h2>
            <p className="text-xs text-muted-foreground">Configured speech-to-text and language evaluation engines.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border/60 bg-secondary/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Audio Transcription</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Active
              </span>
            </div>
            <div className="font-medium text-sm text-foreground">Groq Whisper Large v3</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ultra-fast server-side speech-to-text transcription with word-level timestamps.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border/60 bg-secondary/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Language Evaluation</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Active
              </span>
            </div>
            <div className="font-medium text-sm text-foreground">Google Gemini 3.6 Flash</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Structured professional evaluation schema validated with Zod before persistence.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border/60 bg-secondary/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Audio Capture</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} /> Native
              </span>
            </div>
            <div className="font-medium text-sm text-foreground">MediaRecorder API</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Browser-native audio recording encoded to WebM/Opus format without external plugins.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Audio & Storage Privacy */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Database size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Privacy & Data Management</h2>
            <p className="text-xs text-muted-foreground">Audio storage policies, RLS security, and export controls.</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/50">
            <Shield size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-foreground">Row-Level Security Active:</span> All recordings, transcripts, and evaluation metrics are isolated under Postgres RLS. Only you can read or query your data.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-sm font-medium text-foreground">Export Activity Snapshot</div>
              <div className="text-xs text-muted-foreground">Download a JSON copy of your profile configuration and metrics.</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              className="gap-1.5 text-xs font-medium"
            >
              <Download size={14} />
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Danger Zone */}
      <div className="p-6 rounded-xl border border-destructive/30 bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={18} className="text-destructive" />
          <h2 className="text-base font-semibold text-destructive">Data Controls</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Permanent data deletion actions. Once deleted, recorded audio files and evaluations cannot be recovered.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-medium gap-1.5"
            onClick={() => alert("Audio deletion feature: In Phase 7+, you can batch purge recording files while preserving score histories.")}
          >
            <Trash2 size={13} />
            Purge Audio Files
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-medium"
            onClick={() => alert("To delete your private account, contact system administration or purge from Supabase console.")}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

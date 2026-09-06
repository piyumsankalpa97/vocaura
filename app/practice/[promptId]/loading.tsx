import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function PracticePromptLoading() {
  return (
    <div className="p-6 pb-32 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/70 pb-6">
        <Link 
          href="/practice" 
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground transition-colors disabled pointer-events-none"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Scenario Details */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>

        {/* The Prompt */}
        <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>
        
        {/* Expected Skills & Meta */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <div className="flex-1 p-5 rounded-xl border border-border bg-card/50">
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </div>
          
          <div className="sm:w-48 p-5 rounded-xl border border-border bg-card/50 flex flex-col justify-center">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

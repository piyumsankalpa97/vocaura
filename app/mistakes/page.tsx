import { getUserMistakes } from "@/app/actions/mistakes";
import { MistakeListView } from "./mistake-list-view";
import { PageHeader } from "@/components/layout/page-header";
import { AlertTriangle } from "lucide-react";

export default async function MistakesPage() {
  const { mistakes } = await getUserMistakes();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
            Mistake Intelligence
          </div>
        }
        title="Recurring Weaknesses & Patterns"
        description="Communication patterns and phrasing habits identified across your spoken answers. Repeated errors accumulate here so you can target them directly."
      />

      {/* Main Content */}
      <MistakeListView initialMistakes={mistakes} />
    </div>
  );
}

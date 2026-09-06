import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function MistakesLoading() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <PageHeader
        title="Mistake Library"
        description="Loading your recurring patterns..."
      />
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[120px] rounded-xl" />
      </div>
    </div>
  );
}

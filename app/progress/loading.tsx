import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function ProgressLoading() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <PageHeader
        title="Your Progress"
        description="Loading analytics..."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-[100px] rounded-xl" />
      </div>
      <Skeleton className="h-[350px] rounded-2xl w-full" />
      <Skeleton className="h-[300px] rounded-2xl w-full" />
    </div>
  );
}

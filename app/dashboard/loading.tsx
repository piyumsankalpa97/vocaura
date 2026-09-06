import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Loading dashboard..."
        description="Please wait while we prepare your space."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[120px] rounded-xl" />
      </div>

      <Skeleton className="h-[200px] rounded-2xl" />
      
      <Skeleton className="h-[150px] rounded-2xl" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          <Skeleton className="h-6 w-48" />
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

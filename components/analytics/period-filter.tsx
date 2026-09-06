"use client";

import { Period } from "@/lib/analytics/queries";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PERIODS: { label: string; value: Period }[] = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "All Time", value: "all-time" },
];

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const currentPeriod = (searchParams.get("period") as Period) || "30d";

  const handlePeriodChange = (period: Period) => {
    const params = new URLSearchParams(searchParams);
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex bg-secondary/70 p-1 rounded-lg w-fit border border-border/50">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => handlePeriodChange(p.value)}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            currentPeriod === p.value
              ? "bg-background text-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

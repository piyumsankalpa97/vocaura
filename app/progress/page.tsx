import { 
  getOverallScoreTrend, 
  getCategoryComparison, 
  getActivityVolume, 
  Period 
} from "@/lib/analytics/queries";
import { TrendChart } from "@/components/analytics/trend-chart";
import { CategoryRadarChart } from "@/components/analytics/category-radar-chart";
import { ActivityChart } from "@/components/analytics/activity-chart";
import { PeriodFilter } from "@/components/analytics/period-filter";
import { PageHeader } from "@/components/layout/page-header";
import { TrendingUp } from "lucide-react";

export const metadata = {
  title: "Progress | Vocaura",
};

interface ProgressPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  // Await searchParams in Next 15
  const params = await searchParams;
  const rawPeriod = params.period;
  
  // Validate period
  const validPeriods: Period[] = ["7d", "30d", "90d", "all-time"];
  const period: Period = validPeriods.includes(rawPeriod as Period) ? (rawPeriod as Period) : "30d";

  // Fetch data in parallel
  const [trendData, categoryData, activityData] = await Promise.all([
    getOverallScoreTrend(period),
    getCategoryComparison(period),
    getActivityVolume(period),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp size={15} className="text-primary" />
            Performance Analytics
          </div>
        }
        title="Your Progress"
        description="Track your speaking fluency, pronunciation trends, and practice volume over time."
        action={<PeriodFilter />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Score Trend */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Overall Score Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Weighted performance scores across completed speaking sessions.</p>
          </div>
          <TrendChart data={trendData} />
        </div>

        {/* Category Comparison */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Skill Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Average scores across the five core evaluation dimensions.</p>
          </div>
          <CategoryRadarChart data={categoryData} />
        </div>

        {/* Practice Volume */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Practice Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Total answers recorded and evaluated per day.</p>
          </div>
          <ActivityChart data={activityData} />
        </div>
      </div>
    </div>
  );
}

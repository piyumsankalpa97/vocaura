"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendChartProps {
  data: { date: string; score: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-border">
        No score data available for this period.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#777C76' }} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => {
              // Extract just month and day if possible
              try {
                const d = new Date(val);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              } catch {
                return val;
              }
            }}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 12, fill: '#777C76' }} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid hsl(var(--border))', 
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#A8B8A5" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#A8B8A5', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#A8B8A5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

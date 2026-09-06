"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface ActivityChartProps {
  data: { date: string; sessions: number; minutes: number }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
        No activity data available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(val) => {
              try {
                const d = new Date(val);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              } catch {
                return val;
              }
            }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#64748b' }} 
            tickLine={false} 
            axisLine={false}
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#64748b' }} 
            tickLine={false} 
            axisLine={false}
            label={{ value: 'Sessions', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar yAxisId="left" name="Practice Minutes" dataKey="minutes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" name="Sessions" dataKey="sessions" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

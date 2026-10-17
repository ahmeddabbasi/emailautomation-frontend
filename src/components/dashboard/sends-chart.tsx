"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Bucket {
  date: string;
  initial: number;
  followup: number;
  replies: number;
}

// Bucket keys are calendar dates already in the operator's timezone, so
// they're formatted as plain dates rather than converted again.
function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function SendsChart({ data }: { data: Bucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#26262b" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#616167" }}
          tickFormatter={shortDate}
          minTickGap={16}
          axisLine={{ stroke: "#26262b" }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#616167" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#1a1a1e", border: "1px solid #26262b", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#f2f2f4" }}
          labelFormatter={(v) => shortDate(String(v))}
          cursor={{ fill: "#1a1a1e" }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#97979f" }} />
        <Bar dataKey="initial" stackId="sends" fill="#c6ff3d" name="Initial" radius={[0, 0, 0, 0]} />
        <Bar dataKey="followup" stackId="sends" fill="#6fb2ff" name="Follow-up" radius={[2, 2, 0, 0]} />
        <Line dataKey="replies" stroke="#34d399" strokeWidth={2} dot={false} name="Replies" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

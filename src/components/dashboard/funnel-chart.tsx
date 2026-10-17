"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface FunnelStep {
  step: number;
  label: string;
  count: number;
}

const COLORS = ["#c6ff3d", "#a8e034", "#8ac02b", "#6ca122"];

export function FunnelChart({ data }: { data: FunnelStep[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#26262b" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#616167" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#97979f" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a1e", border: "1px solid #26262b", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#f2f2f4" }}
          cursor={{ fill: "#1a1a1e" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.step} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

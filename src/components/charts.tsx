"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { fontSize: 12, fill: "var(--muted)" };
const tip = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" };

export function TrendChart({ data, dataKey, label }: { data: Record<string, unknown>[]; dataKey: string; label: string }) {
  return (
    <div role="img" aria-label={`${label} by month`} className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey={dataKey} name={label} stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupBars({ data, label }: { data: { label: string; value: number | null; posts: number }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} cursor={{ fill: "var(--surface-2)" }} formatter={(v, _n, item) => [`${v} (n=${(item.payload as { posts: number }).posts})`, "Avg interactions"]} />
          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

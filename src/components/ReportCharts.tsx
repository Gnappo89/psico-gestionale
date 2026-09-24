"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLOR_FATTURATO = "#5d3cc0"; // brand-600
const COLOR_INCASSATO = "#0b8968"; // mint-600
const COLOR_NON_PAGATO = "#dd6c02"; // sunny-600

export function MonthlyBarChart({
  data,
}: {
  data: { mese: string; fatturato: number; incassato: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
        <XAxis
          dataKey="mese"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ borderRadius: 12, border: "1px solid #eef0f4", fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="fatturato"
          name="Fatturato emesso"
          fill={COLOR_FATTURATO}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Bar
          dataKey="incassato"
          name="Incassato"
          fill={COLOR_INCASSATO}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  pagate,
  daPagare,
}: {
  pagate: number;
  daPagare: number;
}) {
  const data = [
    { name: "Incassato", value: pagate, color: COLOR_INCASSATO },
    { name: "Da incassare", value: daPagare, color: COLOR_NON_PAGATO },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
        Nessun dato per questo periodo.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonthLabel } from "@/lib/utils/month";
import type { MonthTrendPoint } from "@/types/ledger";

type IncomeExpenseChartProps = {
  data: MonthTrendPoint[];
};

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthLabel(d.monthKey).replace(" ", "\n"),
  }));

  return (
    <section className="m3-card overflow-hidden p-3 sm:p-4">
      <h3 className="mb-3 text-sm font-bold text-on-surface">
        הכנסות מול הוצאות — 6 חודשים
      </h3>
      <div className="h-56 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--m3-color-outline-variant)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} height={48} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip
              formatter={(v) => `₪${Number(v ?? 0).toLocaleString("he-IL")}`}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.monthKey
                  ? formatMonthLabel(String(payload[0].payload.monthKey))
                  : ""
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="הכנסות" fill="#2d6a3e" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" name="הוצאות" fill="#b54a4a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

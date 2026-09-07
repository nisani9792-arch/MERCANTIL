"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { formatMonthLabel } from "@/lib/utils/month";
import type { ExpenseBreakdownItem, MonthTrendPoint } from "@/types/ledger";

const COLORS = ["#00a878", "#2878ff", "#ffb020", "#875bf7", "#ef5da8", "#6b7280"];

function compact(value: number) {
  return new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CashflowChart({ data }: { data: MonthTrendPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonthLabel(point.monthKey).replace(/ \d{4}$/, ""),
  }));

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00a878" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00a878" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2878ff" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2878ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ direction: "rtl", borderRadius: 14, border: "1px solid rgba(0,0,0,.08)" }} />
          <Area type="monotone" dataKey="income" name="הכנסות" stroke="#00a878" strokeWidth={3} fill="url(#incomeFill)" />
          <Area type="monotone" dataKey="expense" name="הוצאות" stroke="#2878ff" strokeWidth={3} fill="url(#expenseFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ data }: { data: ExpenseBreakdownItem[] }) {
  const chartData = data.slice(0, 6);
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  if (!total) return <div className="flex h-52 items-center justify-center text-sm text-on-surface-variant">עוד אין הוצאות להצגה</div>;

  return (
    <div className="relative h-52 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
            {chartData.map((item, index) => <Cell key={item.category} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ direction: "rtl", borderRadius: 14, border: "1px solid rgba(0,0,0,.08)" }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-on-surface-variant">סה״כ</span>
        <strong className="text-lg text-on-surface">{compact(total)} ₪</strong>
      </div>
    </div>
  );
}

export { COLORS as CHART_COLORS };

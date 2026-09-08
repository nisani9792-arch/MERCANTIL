"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { formatMonthLabel } from "@/lib/utils/month";
import type { ExpenseBreakdownItem, MonthTrendPoint } from "@/types/ledger";

const COLORS = ["#00a878", "#2878ff", "#ffb020", "#875bf7", "#ef5da8", "#6b7280"];

function compact(value: number) {
  return new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CashflowChart({ data }: { data: MonthTrendPoint[] }) {
  const [view, setView] = useState<"flow" | "net">("flow");
  const chartData = data.map((point) => ({
    ...point,
    label: formatMonthLabel(point.monthKey).replace(/ \d{4}$/, ""),
  }));

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-end" dir="rtl">
        <div className="grid grid-cols-2 rounded-xl bg-surface-container p-1 text-xs font-bold">
          <button type="button" onClick={() => setView("flow")} className={`min-h-9 rounded-lg px-3 ${view === "flow" ? "bg-surface-container-lowest text-primary shadow-elevation-1" : "text-on-surface-variant"}`}>הכנסות והוצאות</button>
          <button type="button" onClick={() => setView("net")} className={`min-h-9 rounded-lg px-3 ${view === "net" ? "bg-surface-container-lowest text-primary shadow-elevation-1" : "text-on-surface-variant"}`}>נטו חודשי</button>
        </div>
      </div>
      <div className="h-60 w-full sm:h-64" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {view === "flow" ? (
        <BarChart data={chartData} margin={{ top: 12, right: 4, left: -12, bottom: 0 }} barGap={4}>
          <defs>
            <linearGradient id="incomeBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00a878" /><stop offset="100%" stopColor="#38d9a9" /></linearGradient>
            <linearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2878ff" /><stop offset="100%" stopColor="#74a6ff" /></linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ direction: "rtl", borderRadius: 14, border: "1px solid rgba(0,0,0,.08)" }} />
          <Bar dataKey="income" name="הכנסות" fill="url(#incomeBar)" radius={[7, 7, 2, 2]} maxBarSize={34} />
          <Bar dataKey="expense" name="הוצאות" fill="url(#expenseBar)" radius={[7, 7, 2, 2]} maxBarSize={34} />
        </BarChart>
        ) : (
        <AreaChart data={chartData} margin={{ top: 12, right: 4, left: -12, bottom: 0 }}>
          <defs><linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00a878" stopOpacity={0.28} /><stop offset="100%" stopColor="#00a878" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ direction: "rtl", borderRadius: 14, border: "1px solid rgba(0,0,0,.08)" }} />
          <Area type="monotone" dataKey="net" name="נטו" stroke="#00a878" strokeWidth={3} fill="url(#netFill)" />
        </AreaChart>
        )}
      </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-center gap-5 text-[11px] text-on-surface-variant" dir="rtl">
        {view === "flow" ? <><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#00a878]" />הכנסות</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#2878ff]" />הוצאות</span></> : <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#00a878]" />יתרה לאחר הוצאות</span>}
      </div>
    </div>
  );
}

export function CategoryChart({ data }: { data: ExpenseBreakdownItem[] }) {
  const chartData = data.length <= 6
    ? data
    : [
        ...data.slice(0, 5),
        {
          category: "שאר ההוצאות",
          amount: data.slice(5).reduce((sum, item) => sum + item.amount, 0),
        },
      ];
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  if (!total) return <div className="flex h-52 items-center justify-center text-sm text-on-surface-variant">עוד אין הוצאות להצגה</div>;

  return (
    <div>
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
    <div className="grid grid-cols-2 gap-x-3 gap-y-2" dir="rtl">
      {chartData.map((item, index) => <div key={item.category} className="flex min-w-0 items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate text-on-surface-variant">{item.category}</span><span className="ms-auto shrink-0 font-semibold text-on-surface">{Math.round(item.amount / total * 100)}%</span></div>)}
    </div>
    </div>
  );
}

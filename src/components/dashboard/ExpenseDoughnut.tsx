"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/constants/budget";
import type { ExpenseBreakdownItem } from "@/types/ledger";

type ExpenseDoughnutProps = {
  data: ExpenseBreakdownItem[];
};

export function ExpenseDoughnut({ data }: ExpenseDoughnutProps) {
  if (!data.length) {
    return (
      <section className="m3-card p-4 text-center text-sm text-on-surface-variant">
        אין הוצאות לחודש זה
      </section>
    );
  }

  return (
    <section className="m3-card overflow-hidden p-3 sm:p-4">
      <h3 className="mb-3 text-sm font-bold text-on-surface">פילוח הוצאות</h3>
      <div className="h-52 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) =>
                `₪${Number(v ?? 0).toLocaleString("he-IL")}`
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1">
        {data.slice(0, 6).map((item, i) => (
          <li
            key={item.category}
            className="flex items-center justify-between text-xs"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              {item.category}
            </span>
            <span className="font-semibold" dir="ltr">
              ₪{item.amount.toLocaleString("he-IL")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { formatMonthLabel } from "@/lib/utils/month";
import { useMonthStore } from "@/stores/useMonthStore";

export function MonthNavigator() {
  const { monthKey, shiftMonth, setMonthKey } = useMonthStore();
  const touchStart = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > 50) shiftMonth(delta > 0 ? -1 : 1);
    touchStart.current = null;
  }

  return (
    <div
      className="m3-card flex items-center gap-2 p-2"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-lg font-bold text-on-surface-variant transition-transform active:scale-95"
        aria-label="חודש קודם"
      >
        ›
      </button>

      <div className="relative min-w-0 flex-1">
        <select
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          className="m3-input w-full appearance-none py-3 pe-10 ps-3 text-center text-sm font-bold"
        >
          {buildMonthOptions().map((key) => (
            <option key={key} value={key}>
              {formatMonthLabel(key)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
      </div>

      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-lg font-bold text-on-surface-variant transition-transform active:scale-95"
        aria-label="חודש הבא"
      >
        ‹
      </button>
    </div>
  );
}

function buildMonthOptions(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

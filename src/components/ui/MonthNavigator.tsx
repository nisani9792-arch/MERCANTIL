"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { currentMonthKey, formatMonthLabel } from "@/lib/utils/month";
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
      className="flex items-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-container-low px-1.5 py-1.5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={() => shiftMonth(-1)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
        aria-label="חודש קודם"
      >
        ›
      </button>

      <label className="relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-surface px-2 py-2.5 text-center text-sm font-black text-on-surface transition-colors hover:bg-surface-container-high">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{formatMonthLabel(monthKey)}</span>
        <input
          type="month"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="בחירת חודש"
        />
      </label>

      <button
        type="button"
        onClick={() => shiftMonth(1)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
        aria-label="חודש הבא"
      >
        ‹
      </button>
      {monthKey !== currentMonthKey() && <button type="button" onClick={() => setMonthKey(currentMonthKey())} className="shrink-0 rounded-lg px-2 py-2 text-[11px] font-black text-primary hover:bg-primary-container">היום</button>}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useMonthStore } from "@/stores/useMonthStore";

const isMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Shares the selected month between every device signed into the personal account. */
export function MonthSync() {
  const monthKey = useMonthStore((state) => state.monthKey);
  const setMonthKey = useMonthStore((state) => state.setMonthKey);
  const hydrated = useRef(false);
  const lastRemote = useRef("");

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const response = await fetch("/api/preferences/month", { cache: "no-store" });
        const data = await response.json() as { monthKey?: unknown };
        if (!cancelled && isMonth(data.monthKey) && data.monthKey !== useMonthStore.getState().monthKey) {
          lastRemote.current = data.monthKey;
          setMonthKey(data.monthKey);
        }
      } catch { /* the active device keeps its last confirmed server view */ }
    };
    void pull().finally(() => { hydrated.current = true; });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void pull(); }, 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [setMonthKey]);

  useEffect(() => {
    if (!hydrated.current || monthKey === lastRemote.current) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/preferences/month", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthKey }) });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [monthKey]);

  return null;
}

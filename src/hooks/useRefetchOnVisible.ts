"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMonthStore } from "@/stores/useMonthStore";

/**
 * The database is the single source of truth. Besides focus/restore events we
 * refresh active screens while they are visible, so an open phone and desktop
 * stay aligned without relying on fragile browser-local state.
 */
export function useRefetchOnVisible() {
  const qc = useQueryClient();
  const monthKey = useMonthStore((s) => s.monthKey);

  useEffect(() => {
    function refetchAll() {
      void qc.refetchQueries({ queryKey: ["ledger", monthKey] });
      void qc.refetchQueries({ queryKey: ["analytics", monthKey] });
      void qc.refetchQueries({ queryKey: ["ai-insights", monthKey] });
      void qc.refetchQueries({ queryKey: ["templates"] });
      void qc.refetchQueries({ queryKey: ["financial-snapshot"] });
    }

    function onVisible() {
      if (document.visibilityState === "visible") refetchAll();
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) refetchAll();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetchAll);
    window.addEventListener("pageshow", onPageShow);
    const syncTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") refetchAll();
    }, 15_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetchAll);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(syncTimer);
    };
  }, [qc, monthKey]);
}

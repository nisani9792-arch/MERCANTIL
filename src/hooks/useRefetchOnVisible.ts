"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMonthStore } from "@/stores/useMonthStore";

/** Refetch budget data when the PWA/tab becomes visible (critical on mobile). */
export function useRefetchOnVisible() {
  const qc = useQueryClient();
  const monthKey = useMonthStore((s) => s.monthKey);

  useEffect(() => {
    function refetchAll() {
      void qc.refetchQueries({ queryKey: ["ledger", monthKey] });
      void qc.refetchQueries({ queryKey: ["analytics", monthKey] });
      void qc.refetchQueries({ queryKey: ["ai-insights", monthKey] });
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

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetchAll);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [qc, monthKey]);
}

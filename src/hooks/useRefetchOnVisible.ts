"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** React Query handles focus/reconnect; polling refreshes only visible, stale queries. */
export function useRefetchOnVisible() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void qc.refetchQueries({ type: "active", stale: true });
    };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) refresh(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("pageshow", onPageShow);
    return () => { window.clearInterval(timer); window.removeEventListener("pageshow", onPageShow); };
  }, [qc]);
}

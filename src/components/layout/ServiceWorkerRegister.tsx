"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // A versioned URL bypasses stale mobile PWA registrations after a release.
    // updateViaCache keeps the browser from reusing a previously cached worker.
    void navigator.serviceWorker.register("/sw.js?version=20260928-2", {
      scope: "/",
      updateViaCache: "none",
    }).then((registration) => registration.update());
  }, []);

  return null;
}

"use client";

import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export function InstallPrompt() {
  const { canInstall, install, dismiss, isIos } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <aside
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-elevation-2 sm:inset-x-auto sm:start-4 sm:bottom-4 sm:max-w-sm"
      aria-label="התקנת אפליקציה"
    >
      <Image
        src="/icon-shortcut.png"
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-2xl"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-on-surface">התקן את מרכנטיל</p>
        {isIos ? (
          <p className="text-xs text-on-surface-variant">
            Safari: <Share className="inline h-3.5 w-3.5" /> שיתוף → הוסף למסך הבית
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">
            גישה מהירה מהמסך הראשי
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isIos && (
          <button
            type="button"
            onClick={() => void install()}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-on-primary"
          >
            <Download className="h-4 w-4" />
            התקן
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

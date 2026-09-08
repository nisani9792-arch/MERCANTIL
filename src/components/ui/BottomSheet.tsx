"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  dirty?: boolean;
};

export function BottomSheet({ open, onClose, title, children, footer, dirty = false }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function requestClose() {
    if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?")) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="סגור"
        onClick={requestClose}
      />
      <div className="m3-bottom-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface-container-lowest pt-3 shadow-elevation-2 sm:max-h-[min(88dvh,760px)] sm:max-w-xl sm:rounded-[28px] sm:pt-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant sm:hidden" />
        <div className="mb-3 flex shrink-0 items-center justify-between px-4 sm:px-6">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            aria-label="סגור חלון"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,.06)] sm:px-6 sm:pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="סגור"
        onClick={onClose}
      />
      <div className="m3-bottom-sheet relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] bg-surface-container-lowest px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-elevation-2 sm:max-w-xl sm:rounded-[28px] sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

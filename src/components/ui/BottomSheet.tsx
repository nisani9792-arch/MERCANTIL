"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  dirty?: boolean;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  dirty = false,
}: BottomSheetProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<() => void>(() => {});
  useEffect(() => {
    close.current = () => {
      if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?"))
        return;
      onClose();
    };
  }, [dirty, onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    const firstField = panel.current?.querySelector<HTMLElement>(
      "input, textarea, select",
    );
    (firstField ?? focusable()[0] ?? panel.current)?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0],
        last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  function requestClose() {
    if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?"))
      return;
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
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="m3-bottom-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-surface-container-lowest pt-3 shadow-elevation-2 sm:max-h-[min(88dvh,760px)] sm:max-w-xl sm:rounded-[20px] sm:pt-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant sm:hidden" />
        <div className="mb-3 flex shrink-0 items-center justify-between px-4 sm:px-6">
          <h2 id={titleId} className="text-base font-bold text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            aria-label="סגור חלון"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,.06)] sm:px-6 sm:pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const PIN_LENGTH = 4;

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["back", "0", "enter"],
] as const;

export function PinGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const needsSetup = searchParams.get("setup") === "database";

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const submitPin = useCallback(
    async (value: string) => {
      if (value.length !== PIN_LENGTH) return;
      setError(null);
      setLoading(true);

      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ pin: value }),
        });

        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "קוד שגוי");
          setPin("");
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setLoading(false);
          return;
        }

        router.push(redirect);
        router.refresh();
      } catch {
        setError("לא ניתן להתחבר לשרת");
      } finally {
        setLoading(false);
      }
    },
    [redirect, router],
  );

  function pressKey(key: string) {
    if (loading) return;
    setError(null);

    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }

    if (key === "enter") {
      void submitPin(pin);
      return;
    }

    setPin((p) => {
      if (p.length >= PIN_LENGTH) return p;
      const next = p + key;
      if (next.length === PIN_LENGTH) {
        setTimeout(() => void submitPin(next), 120);
      }
      return next;
    });
  }

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-surface px-4 py-6 safe-top safe-bottom"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.1),transparent_55%)]" />
      <div className="m3-card relative w-full max-w-sm p-5 sm:p-8">
        <div className="mb-5 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="מרכנטיל"
            width={220}
            height={90}
            priority
            className="h-auto w-full max-w-[200px] object-contain"
          />
          <p className="mt-3 text-sm font-semibold text-on-surface">קוד גישה</p>
        </div>

        {needsSetup && (
          <div className="mb-4 rounded-lg border border-warning bg-warning-container/30 p-3 text-xs text-on-surface">
            הגדר DATABASE_URL ו-SESSION_SECRET בשרת.
          </div>
        )}

        {/* PIN dots — no keyboard focus */}
        <div
          className={cn(
            "mb-6 flex justify-center gap-3",
            shake && "pin-shake",
          )}
          dir="ltr"
          aria-label="קוד גישה"
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
                i < pin.length
                  ? "scale-110 border-primary bg-primary"
                  : "border-outline-variant bg-transparent",
                error && i < pin.length && "border-error bg-error",
              )}
            />
          ))}
        </div>

        {error && (
          <p className="m3-error mb-4 text-center text-sm" role="alert">
            {error}
          </p>
        )}

        {loading && (
          <p className="mb-4 text-center text-sm text-secondary">נכנס...</p>
        )}

        {/* Built-in numeric keypad */}
        <div className="grid grid-cols-3 gap-2" dir="ltr">
          {KEYPAD.flat().map((key) => {
            if (key === "back") {
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading || pin.length === 0}
                  onClick={() => pressKey("back")}
                  className="flex min-h-[52px] items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant transition-colors active:bg-surface-container-high disabled:opacity-40"
                  aria-label="מחק"
                >
                  <Delete className="h-5 w-5" />
                </button>
              );
            }
            if (key === "enter") {
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading || pin.length < PIN_LENGTH}
                  onClick={() => pressKey("enter")}
                  className="m3-btn-primary flex min-h-[52px] items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
                  aria-label="כניסה"
                >
                  ✓
                </button>
              );
            }
            return (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => pressKey(key)}
                className="flex min-h-[52px] items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-low text-xl font-semibold text-on-surface transition-all active:scale-95 active:bg-primary-container active:text-primary"
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

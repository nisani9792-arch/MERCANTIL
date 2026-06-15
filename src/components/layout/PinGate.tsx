"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const PIN_LENGTH = 6;

export function PinGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const needsSetup = searchParams.get("setup") === "database";

  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const pinValue = digits.join("").replace(/\D/g, "");

  const submitPin = useCallback(
    async (pin: string) => {
      if (pin.length < 4) return;
      setError(null);
      setLoading(true);

      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ pin }),
        });

        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "קוד שגוי");
          setDigits(Array(PIN_LENGTH).fill(""));
          inputsRef.current[0]?.focus();
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

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);

    if (char && index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const assembled = next.join("");
    if (assembled.length === PIN_LENGTH) {
      void submitPin(assembled);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      void submitPin(pinValue);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!pasted) return;
    const next = Array(PIN_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length >= 4) void submitPin(pasted);
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-surface px-4 py-6 safe-top safe-bottom">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.1),transparent_55%)]" />
      <div className="m3-card relative w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="מרכנטיל"
            width={240}
            height={100}
            priority
            className="h-auto w-full max-w-[220px] object-contain"
          />
          <p className="mt-4 text-sm font-semibold text-on-surface">הזן קוד גישה</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            משק בית פרטי — כניסה מיידית
          </p>
        </div>

        {needsSetup && (
          <div className="mb-4 rounded-lg border border-warning bg-warning-container/30 p-3 text-xs text-on-surface">
            הגדר DATABASE_URL, SESSION_SECRET ו-APP_PIN בשרת.
          </div>
        )}

        <div
          className="flex justify-center gap-2 sm:gap-3"
          dir="ltr"
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={d}
              disabled={loading}
              aria-label={`ספרה ${i + 1}`}
              className={cn(
                "h-12 w-10 rounded-xl border-2 bg-surface-container-low text-center text-lg font-bold text-on-surface transition-colors sm:h-14 sm:w-12 sm:text-xl",
                "border-outline-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                error && "border-error/50",
              )}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        {error && (
          <p className="m3-error mt-4 text-center" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={loading || pinValue.length < 4}
          onClick={() => submitPin(pinValue)}
          className={cn(
            "m3-btn-primary mt-6 w-full min-h-[48px] py-2.5",
            loading && "opacity-70",
          )}
        >
          {loading ? "נכנס..." : "כניסה"}
        </button>
      </div>
    </div>
  );
}

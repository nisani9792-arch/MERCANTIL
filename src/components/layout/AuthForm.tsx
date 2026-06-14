"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const needsSetup = searchParams.get("setup") === "database";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(mode === "register" && fullName ? { fullName } : {}),
      }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "שגיאה בהתחברות");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
    setLoading(false);
  }

  const isRegister = mode === "register";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.08),transparent_60%)]" />
      <div className="m3-card relative w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="מרכנטיל — לירה לבנה ליום שחור"
            width={280}
            height={120}
            priority
            className="h-auto w-full max-w-[260px] object-contain"
          />
          <p className="mt-4 text-on-surface">
            {isRegister ? "יצירת חשבון חדש" : "התחברות למערכת"}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            ניהול כלכלי חכם מבוסס AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsSetup && (
            <div className="rounded-lg border border-warning bg-warning-container/30 p-3 text-sm text-on-surface">
              הגדר Neon: העתק <code dir="ltr">.env.local.example</code> ל-
              <code dir="ltr">.env.local</code> ומלא DATABASE_URL + SESSION_SECRET.
            </div>
          )}

          {isRegister && (
            <div className="space-y-1">
              <label htmlFor="fullName" className="m3-label block">
                שם מלא
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="m3-input w-full px-3 py-2"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="m3-label block">
              אימייל
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="m3-input w-full px-3 py-2"
              autoComplete="email"
              dir="ltr"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="m3-label block">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="m3-input w-full px-3 py-2"
              autoComplete={isRegister ? "new-password" : "current-password"}
              dir="ltr"
            />
          </div>

          {error && <p className="m3-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={cn("m3-btn-primary w-full py-2.5 px-4")}
          >
            {loading ? "מעבד..." : isRegister ? "הרשמה" : "התחברות"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          {isRegister ? (
            <>
              כבר יש לך חשבון?{" "}
              <Link href="/login" className="font-semibold text-secondary">
                התחבר
              </Link>
            </>
          ) : (
            <>
              אין לך חשבון?{" "}
              <Link href="/register" className="font-semibold text-secondary">
                הירשם
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

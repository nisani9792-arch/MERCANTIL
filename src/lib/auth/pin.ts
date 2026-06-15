import { timingSafeEqual } from "node:crypto";

/** Built-in solo-user PIN (override via APP_PIN env if needed) */
export const BUILTIN_PIN = "1614";

const PIN_RE = /^\d{4,6}$/;

export function getConfiguredPin(): string {
  const envPin = process.env.APP_PIN?.trim();
  if (envPin && PIN_RE.test(envPin)) return envPin;
  return BUILTIN_PIN;
}

export function isPinConfigured(): boolean {
  return PIN_RE.test(getConfiguredPin());
}

export function getPinLength(): number {
  return getConfiguredPin().length;
}

/** Timing-safe PIN comparison */
export function verifyPin(input: string): boolean {
  const expected = getConfiguredPin();
  const normalized = input.trim();
  if (!PIN_RE.test(normalized)) return false;
  if (normalized.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}

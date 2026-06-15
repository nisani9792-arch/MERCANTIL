import { timingSafeEqual } from "node:crypto";

const PIN_RE = /^\d{4,6}$/;

export function isPinConfigured(): boolean {
  const pin = process.env.APP_PIN?.trim();
  return !!pin && PIN_RE.test(pin);
}

export function getConfiguredPin(): string | null {
  const pin = process.env.APP_PIN?.trim();
  if (!pin || !PIN_RE.test(pin)) return null;
  return pin;
}

/** Timing-safe PIN comparison */
export function verifyPin(input: string): boolean {
  const expected = getConfiguredPin();
  if (!expected) return false;
  const normalized = input.trim();
  if (!PIN_RE.test(normalized)) return false;
  if (normalized.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}

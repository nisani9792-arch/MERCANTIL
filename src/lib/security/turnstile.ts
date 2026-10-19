import { TURNSTILE_LOGIN_ACTION } from "@/lib/security/turnstile-config";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerification = {
  success?: unknown;
  action?: unknown;
  hostname?: unknown;
};

function getExpectedHostnames(): Set<string> {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || undefined;
}

export async function verifyTurnstileLogin(
  request: Request,
  token: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  const expectedHostnames = getExpectedHostnames();
  const remoteip = getClientIp(request);

  if (!secret || !token || token.length > 2048 || expectedHostnames.size === 0) {
    return false;
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return false;
    const result = (await response.json()) as TurnstileVerification;
    return (
      result.success === true &&
      result.action === TURNSTILE_LOGIN_ACTION &&
      typeof result.hostname === "string" &&
      expectedHostnames.has(result.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

const KEEP_ALIVE_INTERVAL_MS = 9 * 60 * 1000;
const FIRST_PING_DELAY_MS = 60 * 1000;

declare global {
  var __merkanpilKeepAliveStarted: boolean | undefined;
}

async function pingPublicService() {
  const hostname = process.env.RENDER_EXTERNAL_HOSTNAME?.trim();
  const configuredUrl = process.env.KEEP_ALIVE_URL?.trim();
  const baseUrl = configuredUrl || (hostname ? `https://${hostname}` : "");

  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/api/keep-alive`, {
      cache: "no-store",
      headers: { "User-Agent": "merkanpil-keep-alive/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.warn("[keep-alive] ping failed", error);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  if (process.env.KEEP_ALIVE_ENABLED === "false") return;
  if (!process.env.RENDER && !process.env.KEEP_ALIVE_URL) return;
  if (globalThis.__merkanpilKeepAliveStarted) return;

  globalThis.__merkanpilKeepAliveStarted = true;
  const firstPing = setTimeout(() => void pingPublicService(), FIRST_PING_DELAY_MS);
  const interval = setInterval(() => void pingPublicService(), KEEP_ALIVE_INTERVAL_MS);
  firstPing.unref();
  interval.unref();
}

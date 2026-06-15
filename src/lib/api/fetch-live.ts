/** Client fetch that bypasses browser and SW caches for live data. */
export async function fetchLive<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  return res.json() as Promise<T>;
}

export async function mutateLive(
  url: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(init.headers ?? {}),
    },
  });
}

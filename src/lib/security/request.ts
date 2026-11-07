/** Browser requests must originate from this application; native API clients may omit Origin. */
export function requestViolation(request: Request): {status: number; error: string} | null {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return null;
  const origin = request.headers.get("origin");
  try {
    if ((origin && new URL(origin).origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return {status: 403, error: "הבקשה אינה מהאתר המורשה"};
    }
  } catch { return {status: 403, error: "מקור הבקשה אינו תקין"}; }
  const isUpload = new URL(request.url).pathname === "/api/import/xlsx";
  const limit = isUpload ? 9 * 1024 * 1024 : 2 * 1024 * 1024;
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) return {status: 413, error: "הבקשה גדולה מדי"};
  return null;
}

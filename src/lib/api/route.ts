import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorCode = "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR" | "RATE_LIMITED" | "FORBIDDEN" | "CONFLICT";

export class RouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function apiError(error: unknown, context: string) {
  if (error instanceof RouteError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: error.retryAfter ? {"Retry-After":String(error.retryAfter),"Cache-Control":"no-store"} : {"Cache-Control":"no-store"} });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "הנתונים שנשלחו אינם תקינים", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  // Keep operational details in Workers logs, never in a financial UI response.
  const incidentId = logServerError(context, error);
  return NextResponse.json(
    { error: "פעולת השרת נכשלה. נסה שוב בעוד רגע.", code: "INTERNAL_ERROR", incidentId },
    { status: 500 },
  );
}

export function logServerError(context: string, error: unknown) {
  const incidentId = crypto.randomUUID().slice(0, 8);
  const code = (error as {code?: unknown})?.code;
  console.error(`[api:${context}]`, {incidentId, name: error instanceof Error ? error.name : "Unknown", ...(typeof code === "string" && /^[A-Z0-9_]{1,40}$/.test(code) ? {code} : {})});
  return incidentId;
}

export function withApi<Args extends unknown[]>(handler: (...args: Args) => Response | Promise<Response>, context: string) {
  return async (...args: Args): Promise<Response> => {
    try { return await handler(...args); }
    catch (error) { return apiError(error, context); }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RouteError(400,"INVALID_REQUEST","גוף הבקשה חסר");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw new RouteError(413,"INVALID_REQUEST","הבקשה גדולה מדי"); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk,offset);offset+=chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch (error) {
    if (error instanceof RouteError) throw error;
    throw new RouteError(400,"INVALID_REQUEST","גוף הבקשה אינו תקין");
  } finally { reader.releaseLock(); }
}

export const noStoreHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate" } as const;

/** Bound actual multipart bytes even when Content-Length is missing or forged. */
export async function readFormData(request: Request): Promise<FormData> {
  const reader=request.body?.getReader();
  if(!reader)throw new RouteError(400,"INVALID_REQUEST","קובץ חסר");
  const chunks:Uint8Array[]=[];let bytes=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
      if(bytes>9*1024*1024){await reader.cancel();throw new RouteError(413,"INVALID_REQUEST","הקובץ גדול מדי");}chunks.push(value);}
    const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
    return await new Response(buffer,{headers:{"Content-Type":request.headers.get("content-type")??""}}).formData();
  } catch(error){if(error instanceof RouteError)throw error;throw new RouteError(400,"INVALID_REQUEST","העלאת הקובץ אינה תקינה");}
  finally{reader.releaseLock();}
}

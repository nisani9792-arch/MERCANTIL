import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ErrorCode = "UNAUTHORIZED" | "INVALID_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR";

export class RouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function apiError(error: unknown, context: string) {
  if (error instanceof RouteError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "הנתונים שנשלחו אינם תקינים", code: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  // Keep operational details in Workers logs, never in a financial UI response.
  console.error(`[api:${context}] unexpected error`, error);
  return NextResponse.json(
    { error: "פעולת השרת נכשלה. נסה שוב בעוד רגע.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new RouteError(400, "INVALID_REQUEST", "גוף הבקשה אינו תקין");
  }
}

export const noStoreHeaders = { "Cache-Control": "no-store, no-cache, must-revalidate" } as const;

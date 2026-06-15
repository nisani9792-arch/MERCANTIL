import { NextResponse } from "next/server";
import { getAuthSetupError } from "@/lib/auth/env-check";
import { verifyPin } from "@/lib/auth/pin";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getOrCreateSoloUser } from "@/lib/auth/solo-user";
import { ensureAppSchema } from "@/lib/db/ensure-schema";

export async function POST(request: Request) {
  const setupError = getAuthSetupError();
  if (setupError) {
    return NextResponse.json({ error: setupError }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim() ?? "";

    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
    }

    await ensureAppSchema();
    const user = await getOrCreateSoloUser();

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    console.error("[auth/pin]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAuthSetupError } from "@/lib/auth/env-check";
import { verifyPin } from "@/lib/auth/pin";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getOrCreateSoloUser } from "@/lib/auth/solo-user";
import { verifyTurnstileLogin } from "@/lib/security/turnstile";

export async function POST(request: Request) {
  const setupError = getAuthSetupError();
  if (setupError) {
    return NextResponse.json({ error: setupError }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { pin?: string; turnstileToken?: string };
    const pin = body.pin?.trim() ?? "";
    const turnstileToken = body.turnstileToken?.trim() ?? "";

    if (!(await verifyTurnstileLogin(request, turnstileToken))) {
      return NextResponse.json(
        { error: "אימות האבטחה נכשל. נסה שנית." },
        { status: 403 },
      );
    }

    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "קוד שגוי" }, { status: 401 });
    }

    // Schema migrations are handled by the health/startup path. Running the
    // full migration set during an interactive PIN request can exceed an edge
    // request budget on a cold Worker.
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

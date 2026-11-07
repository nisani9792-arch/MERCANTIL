import { apiError } from "@/lib/api/route";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/api/route";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSetupError } from "@/lib/auth/env-check";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail, verifyPassword } from "@/lib/auth/users";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});


async function POSTHandler(request: Request) {
  const setupError = getAuthSetupError();
  if (setupError) {
    return NextResponse.json({ error: setupError }, { status: 503 });
  }

  try {
    await enforceRateLimit(request, "auth.login", undefined, 10, 600);
    const body = loginSchema.parse(await readJson(request));
    const user = await findUserByEmail(body.email);

    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      return NextResponse.json(
        { error: "אימייל או סיסמה שגויים" },
        { status: 401 },
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    logServerError("[auth/login]", err);
    return apiError(err, "auth.login");
  }
}

export const POST = withApi(POSTHandler, "auth.login.post");

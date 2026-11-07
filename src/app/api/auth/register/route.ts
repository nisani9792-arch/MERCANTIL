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
import { createUser, findUserByEmail } from "@/lib/auth/users";
import { ensureAppSchema } from "@/lib/db/ensure-schema";

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(256),
  fullName: z.string().trim().max(120).optional(),
});


async function POSTHandler(request: Request) {
  const setupError = getAuthSetupError();
  if (setupError) {
    return NextResponse.json({ error: setupError }, { status: 503 });
  }

  try {
    await enforceRateLimit(request, "auth.register", undefined, 3, 3600);
    const body = registerSchema.parse(await readJson(request));
    if (body.email.trim().toLowerCase() === (process.env.SOLO_USER_EMAIL ?? "owner@mercantil.local").toLowerCase()) return NextResponse.json({error:"לא ניתן לרשום כתובת זו"},{status:400});
    await ensureAppSchema();

    const existing = await findUserByEmail(body.email);
    if (existing) {
      return NextResponse.json(
        { error: "כתובת האימייל כבר רשומה" },
        { status: 409 },
      );
    }

    const user = await createUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
    });

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
    logServerError("[auth/register]", err);
    return apiError(err, "auth.register");
  }
}

export const POST = withApi(POSTHandler, "auth.register.post");

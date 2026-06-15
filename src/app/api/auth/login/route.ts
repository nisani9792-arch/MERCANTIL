import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSetupError } from "@/lib/auth/env-check";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail, verifyPassword } from "@/lib/auth/users";
import { ensureAppSchema } from "@/lib/db/ensure-schema";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function mapAuthError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "SESSION_SECRET_MISSING") {
      return "SESSION_SECRET לא מוגדר בשרת (Render → Environment).";
    }
    if (err.message.includes("DATABASE_URL")) {
      return "חיבור למסד הנתונים נכשל. בדוק DATABASE_URL.";
    }
    if (/relation "users" does not exist/i.test(err.message)) {
      return "מסד הנתונים לא אותחל. הרץ db:init או נסה שוב.";
    }
  }
  return "שגיאת שרת";
}

export async function POST(request: Request) {
  const setupError = getAuthSetupError();
  if (setupError) {
    return NextResponse.json({ error: setupError }, { status: 503 });
  }

  try {
    const body = loginSchema.parse(await request.json());
    await ensureAppSchema();

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
    console.error("[auth/login]", err);
    return NextResponse.json({ error: mapAuthError(err) }, { status: 500 });
  }
}

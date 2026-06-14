import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail, verifyPassword } from "@/lib/auth/users";
import { isDatabaseConfigured } from "@/lib/db/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL לא מוגדר" },
      { status: 503 },
    );
  }

  try {
    const body = loginSchema.parse(await request.json());
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
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

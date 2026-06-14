import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/auth/users";
import { isDatabaseConfigured } from "@/lib/db/client";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL לא מוגדר" },
      { status: 503 },
    );
  }

  try {
    const body = registerSchema.parse(await request.json());
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
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

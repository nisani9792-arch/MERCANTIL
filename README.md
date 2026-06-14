# מרכנטיל — לירה לבנה ליום שחור

ניהול כלכלי חכם מבוסס AI. Next.js 16 + Neon PostgreSQL + Gemini.

## התחלה מהירה

```bash
npm install
cp .env.local.example .env.local
# מלא DATABASE_URL, SESSION_SECRET, GEMINI_API_KEY
npm run db:init
npm run dev
```

## סטאק

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | Next.js 16, React 19, Tailwind v4, M3 |
| DB | Neon PostgreSQL (`@neondatabase/serverless`) |
| Auth | JWT sessions (httpOnly cookie) |
| AI | Google Gemini API |

## מבנה

- `src/app/(auth)/` — התחברות והרשמה
- `src/app/(app)/` — routes מוגנים
- `src/lib/db/` — Neon client
- `src/lib/auth/` — sessions + users
- `src/lib/ai/` — Gemini integration
- `db/migrations/` — סכמת PostgreSQL
- `public/logo.png` — לוגו מרכנטיל
- `public/manifest.webmanifest` — PWA + קיצורי דרך

## API

- `POST /api/auth/login` — התחברות
- `POST /api/auth/register` — הרשמה
- `POST /api/auth/logout` — יציאה
- `GET /api/ai/health` — בדיקת Neon + Gemini

## אבטחה

**לעולם אל תעלה `.env.local` ל-Git.** אם מפתחות דלפו — החלף אותם ב-Neon וב-Google Cloud Console.

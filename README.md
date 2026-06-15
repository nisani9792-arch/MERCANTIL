# מרכנטיל — לירה לבנה ליום שחור

ניהול כלכלי חכם מבוסס AI. Next.js 16 + Neon PostgreSQL + Gemini.

## התקנה והפעלה מקומית

```bash
npm install
cp .env.local.example .env.local
# מלא את המשתנים (ראה למטה)
npm run db:init
npm run dev
```

פתח http://localhost:3000

## משתני סביבה (`.env.local`)

| משתנה | חובה | תיאור |
|--------|------|--------|
| `DATABASE_URL` | כן | Connection string מ-Neon PostgreSQL |
| `SESSION_SECRET` | כן | מחרוזת אקראית 32+ תווים (לחתימת cookies) |
| `GEMINI_API_KEY` | מומלץ | מפתח Google AI Studio לסיווג חכם |
| `GEMINI_MODEL` | לא | ברירת מחדל: `gemini-2.0-flash` |
| `SEED_USER_EMAIL` | לא | לייבוא ראשוני (ברירת מחדל: shin@mercantil.app) |
| `SEED_USER_PASSWORD` | לא | סיסמה לייבוא ראשוני |

### דוגמה

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
SESSION_SECRET=your-random-secret-at-least-32-chars-long
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash
```

## ייבוא נתוני בנק (Excel)

```bash
npm run import:bank "C:\path\to\עובר ושב.xlsx"
```

או דרך הממשק: **ייבוא AI** → העלה קובץ xlsx

## פריסה ל-Vercel

1. דחוף ל-GitHub: `git push origin master`
2. היכנס ל-[vercel.com](https://vercel.com) → Import Project → בחר `MERCANTIL`
3. הוסף Environment Variables (אותם משתנים כמו `.env.local`)
4. Deploy

או CLI:

```bash
npx vercel --prod
```

## פקודות

| פקודה | תיאור |
|--------|--------|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בנייה ל-production |
| `npm start` | הרצה אחרי build |
| `npm run db:init` | יצירת טבלאות + קטגוריות |
| `npm run import:bank` | ייבוא xlsx + למידת AI |

## API

- `POST /api/import/xlsx` — ייבוא קובץ בנק
- `POST /api/ai/categorize` — סיווג AI
- `GET /api/ai/insights` — תובנות

## אבטחה

**לעולם אל תעלה `.env.local` ל-Git.** החלף מפתחות אם דלפו.

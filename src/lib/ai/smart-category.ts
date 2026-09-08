import type { ExpenseCategory } from "@/lib/constants/budget";

export type CategoryGuess = {
  category: ExpenseCategory;
  confidence: number;
  reason: string;
};

const CATEGORY_RULES: Array<{
  category: ExpenseCategory;
  pattern: RegExp;
  reason: string;
}> = [
  { category: "דיור", pattern: /שכר\s?דירה|שכירות|משכנת[אה]|ארנונה|חשמל|חברת החשמל|חשבון\s?מים|תאגיד\s?מים|גז|ועד\s?בית|עמידר|rent|mortgage/i, reason: "זוהו מונחי דיור וחשבונות בית" },
  { category: "בריאות", pattern: /רופא|רפוא[הי]|בית\s?מרקחת|פארם|סופר-?פארם|תרופ[הות]|כללית|מכבי|מאוחדת|לאומית|שיניים|דנט|אופטיקה|בריאות/i, reason: "זוהתה הוצאת בריאות" },
  { category: "מזון", pattern: /סופר|סופרמרקט|מכולת|רמי\s?לוי|שופרסל|ויקטורי|קרפור|יוחננוף|אושר\s?עד|מחסני\s?השוק|חצי\s?חינם|טיב\s?טעם|market/i, reason: "זוהתה רכישת מזון לבית" },
  { category: "מסעדות", pattern: /מסעד[הות]|וולט|wolt|תן\s?ביס|ten\s?bis|משלוחה|קפה|coffee|פיצה|בורגר|מקדונלד|ארומה|ארוח[הות]/i, reason: "זוהתה אכילה מחוץ לבית" },
  { category: "תחבורה", pattern: /דלק|פז|סונול|דור\s?אלון|yellow|כביש\s?6|רב\s?קו|רכבת|אוטובוס|מונית|גט|gett|חניה|פנגו|pango|מוסך|טסט|רכב|תחבורה/i, reason: "זוהתה הוצאת תחבורה או רכב" },
  { category: "מנויים", pattern: /מנוי|נטפליקס|netflix|ספוטיפיי|spotify|youtube|icloud|google\s?one|apple|דיסני|disney|פרטנר|סלקום|בזק|הוט|yes|אינטרנט|subscription/i, reason: "זוהה שירות או מנוי חוזר" },
  { category: "ילדים", pattern: /ילד|ילדים|גן|צהרון|מטפל[ת]?|בייביסיטר|חוג|בית\s?ספר|תינוק|טיטול|צעצוע/i, reason: "זוהתה הוצאה הקשורה לילדים" },
  { category: "פנאי", pattern: /קולנוע|סינמה|הופעה|מלון|נופש|חופשה|טיסה|כרטיסים|בילוי|משחק|playstation|xbox|סטימצקי|ספר/i, reason: "זוהתה הוצאת פנאי ובילוי" },
  { category: "קניות", pattern: /אמזון|amazon|עלי\s?אקספרס|aliexpress|שיין|shein|זארה|zara|איקאה|ikea|ksp|אייבורי|ivory|בגד|נעל|ריהוט|קניון|קניות/i, reason: "זוהתה קנייה כללית" },
];

export function inferExpenseCategory(description: string): CategoryGuess {
  const normalized = description.trim().replace(/[״׳]/g, "").replace(/\s+/g, " ");
  if (!normalized) return { category: "אחר", confidence: 0, reason: "נדרש תיאור" };

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(normalized)) {
      return { category: rule.category, confidence: 0.9, reason: rule.reason };
    }
  }

  return { category: "אחר", confidence: 0.35, reason: "לא נמצאה התאמה ודאית" };
}

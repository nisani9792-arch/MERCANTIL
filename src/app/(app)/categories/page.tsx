import { CategoryManager } from "@/components/bank/CategoryManager";

export default function CategoriesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">קטגוריות</h1>
        <p className="text-sm text-on-surface-variant">
          ניהול גמיש — יצירה ידנית או הצעות AI
        </p>
      </div>
      <CategoryManager />
    </div>
  );
}

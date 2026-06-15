"use client";

type MonthPickerProps = {
  monthKey: string;
  onChange: (monthKey: string) => void;
};

export function MonthPicker({ monthKey, onChange }: MonthPickerProps) {
  const [y, m] = monthKey.split("-").map(Number);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onChange(key);
  }

  const label = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-2 py-1">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="min-h-[40px] min-w-[40px] rounded-lg text-lg text-on-surface-variant transition-colors hover:bg-surface-container"
        aria-label="חודש קודם"
      >
        ›
      </button>
      <span className="text-sm font-semibold text-on-surface">{label}</span>
      <button
        type="button"
        onClick={() => shift(1)}
        className="min-h-[40px] min-w-[40px] rounded-lg text-lg text-on-surface-variant transition-colors hover:bg-surface-container"
        aria-label="חודש הבא"
      >
        ‹
      </button>
    </div>
  );
}

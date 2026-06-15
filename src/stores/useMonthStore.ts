import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentMonthKey } from "@/lib/utils/month";

type MonthState = {
  monthKey: string;
  setMonthKey: (key: string) => void;
  shiftMonth: (delta: number) => void;
};

export const useMonthStore = create<MonthState>()(
  persist(
    (set, get) => ({
      monthKey: currentMonthKey(),
      setMonthKey: (monthKey) => set({ monthKey }),
      shiftMonth: (delta) => {
        const [y, m] = get().monthKey.split("-").map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        set({ monthKey: key });
      },
    }),
    { name: "mercantil-month" },
  ),
);

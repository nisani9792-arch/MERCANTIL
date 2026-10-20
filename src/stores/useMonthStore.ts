import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentMonthKey, shiftMonthKey } from "@/lib/utils/month";

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
        set({ monthKey: shiftMonthKey(get().monthKey, delta) });
      },
    }),
    { name: "mercantil-month" },
  ),
);

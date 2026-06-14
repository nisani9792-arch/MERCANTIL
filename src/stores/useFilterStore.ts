import { create } from "zustand";

type FilterStore = {
  dateRange: "week" | "month" | "custom";
  customFrom: string | null;
  customTo: string | null;
  setDateRange: (range: "week" | "month" | "custom") => void;
  setCustomRange: (from: string, to: string) => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  dateRange: "month",
  customFrom: null,
  customTo: null,
  setDateRange: (dateRange) => set({ dateRange }),
  setCustomRange: (customFrom, customTo) =>
    set({ dateRange: "custom", customFrom, customTo }),
}));

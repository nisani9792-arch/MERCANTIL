"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Building2, Trash2 } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PageHeading, StatCard, EmptyState } from "@/components/ui/Workspace";
import { snapshotTotal } from "@/lib/ledger/workspace";
import { formatCurrency } from "@/lib/utils/format";
import type {
  FinancialItemKind,
  FinancialSnapshotItem,
} from "@/lib/db/financial-snapshot";
type Draft = {
  id?: string;
  kind: FinancialItemKind;
  name: string;
  institution: string;
  amount: string;
  dueDate: string;
  notes: string;
};
const empty: Draft = {
  kind: "account",
  name: "",
  institution: "",
  amount: "",
  dueDate: "",
  notes: "",
};
const labels: Record<FinancialItemKind, string> = {
  account: "חשבון בנק",
  savings: "חיסכון",
  deposit: "פיקדון",
  provident_fund: "קופת גמל",
  pension: "פנסיה",
  insurance: "ביטוח",
  loan: "הלוואה",
  income_source: "מקור הכנסה",
  planned_expense: "הוצאה מתוכננת",
  reminder: "תזכורת",
  note: "פתק פיננסי",
};
const tabs = [
  {
    key: "assets",
    label: "נכסים וחסכונות",
    kinds: ["account", "savings", "deposit", "provident_fund", "pension"],
  },
  {
    key: "debts",
    label: "חובות והתחייבויות",
    kinds: ["loan", "insurance", "planned_expense"],
  },
  { key: "income", label: "מקורות הכנסה", kinds: ["income_source"] },
  { key: "notes", label: "תזכורות ופתקים", kinds: ["reminder", "note"] },
] as const;
export function FinancialSnapshot() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [initial, setInitial] = useState<Draft | null>(null);
  const [tab, setTab] = useState("assets");
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["financial-snapshot"],
    queryFn: async () => {
      const res = await fetch("/api/financial-snapshot", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ items: FinancialSnapshotItem[] }>;
    },
  });
  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const res = await fetch(
        value.id
          ? "/api/financial-snapshot/" + value.id
          : "/api/financial-snapshot",
        {
          method: value.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...value,
            amount: value.amount === "" ? null : Number(value.amount),
            dueDate: value.dueDate || null,
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "השמירה נכשלה");
    },
    onSuccess: () => {
      setDraft(null);
      setInitial(null);
      void qc.invalidateQueries({ queryKey: ["financial-snapshot"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/financial-snapshot/" + id, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("המחיקה נכשלה");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financial-snapshot"] }),
  });
  const items = query.data?.items ?? [];
  const selected = tabs.find((t) => t.key === tab)!;
  const visible = items.filter(
    (i) =>
      (selected.kinds as readonly string[]).includes(i.kind) &&
      (i.name + " " + (i.institution ?? "") + " " + (i.notes ?? ""))
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const total = (group: readonly string[]) => snapshotTotal(items, group);
  const missing = items.filter(
    (i) =>
      i.is_active &&
      i.amount === null &&
      i.kind !== "note" &&
      i.kind !== "reminder",
  ).length;
  function open(value: Draft) {
    save.reset();
    setDraft(value);
    setInitial(value);
  }
  const edit = (i: FinancialSnapshotItem) =>
    open({
      id: i.id,
      kind: i.kind,
      name: i.name,
      institution: i.institution ?? "",
      amount: i.amount === null ? "" : String(i.amount),
      dueDate: i.due_date ?? "",
      notes: i.notes ?? "",
    });
  return (
    <div className="workspace-page">
      <PageHeading
        title="נכסים וחובות"
        description="כל המידע שחשוב לשמור, מחולק לקבוצות שקל למצוא."
        action={
          <button
            className="workspace-button workspace-button-primary"
            onClick={() => open({ ...empty, kind: selected.kinds[0] })}
          >
            <Plus className="h-4 w-4" />
            הוספת פריט
          </button>
        }
      />
      {query.isPending ? (
        <p role="status" className="workspace-loading">
          טוען מידע…
        </p>
      ) : query.isError ? (
        <div role="alert" className="workspace-notice">
          לא הצלחנו לטעון את המידע.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            ניסיון חוזר
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="נכסים וחסכונות שהוזנו"
              value={total(tabs[0].kinds)}
              note="כולל חסכונות ארוכי טווח"
            />
            <StatCard
              label="יתרות הלוואות שהוזנו"
              value={total(["loan"])}
              note="לפי סכומי ההלוואות ששמרת"
            />
          </div>
          {missing > 0 && (
            <p className="workspace-muted">
              ל־{missing} פריטים עדיין חסר סכום. הסיכומים כוללים סכומים ידועים
              של פריטים פעילים בלבד.
            </p>
          )}
          <div
            className="workspace-tabs finance-tabs"
            role="tablist"
            aria-label="קבוצת מידע"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                id={"finance-tab-" + t.key}
                aria-controls="finance-items"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setSearch("");
                }}
              >
                {t.label}
                <span className="ms-2 text-[11px]">
                  {
                    items.filter((i) =>
                      (t.kinds as readonly string[]).includes(i.kind),
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <label className="workspace-search">
            <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="חיפוש במידע הפיננסי"
              placeholder="חיפוש שם, מוסד או הערה"
            />
          </label>
          <div
            role="tabpanel"
            id="finance-items"
            aria-labelledby={"finance-tab-" + tab}
          >
            {visible.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visible.map((item) => (
                  <article
                    key={item.id}
                    className="finance-panel flex flex-col"
                  >
                    <div className="mb-4 flex items-start gap-3">
                      <span className="rounded-lg bg-primary-container p-2 text-primary">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold">{item.name}</h2>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {labels[item.kind]}
                          {item.institution ? " · " + item.institution : ""}
                          {!item.is_active ? " · לא פעיל" : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => edit(item)}
                        aria-label={"עריכת " + item.name}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary-container"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    {item.kind !== "note" && item.kind !== "reminder" && (
                      <strong
                        className="mb-3 block text-2xl font-bold"
                        dir="ltr"
                      >
                        {item.amount === null
                          ? "טרם הוזן סכום"
                          : formatCurrency(item.amount)}
                      </strong>
                    )}
                    {item.notes && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-on-surface-variant">
                        {item.notes}
                      </p>
                    )}
                    {item.due_date && (
                      <p className="mt-3 text-xs text-primary">
                        תאריך: {item.due_date.slice(0, 10)}
                      </p>
                    )}
                    <div className="mt-auto flex justify-end pt-4">
                      <button
                        aria-label={"מחיקת " + item.name}
                        onClick={() => {
                          if (window.confirm("למחוק את " + item.name + "?"))
                            remove.mutate(item.id);
                        }}
                        className="flex min-h-10 items-center gap-1.5 text-xs text-on-surface-variant hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        מחיקה
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title={search ? "לא נמצאו פריטים" : "עוד אין כאן פריטים"}
                description={
                  search
                    ? "אפשר לשנות את מילות החיפוש."
                    : "הוסף מידע כשהוא רלוונטי לך. אין צורך למלא את כל הקבוצות."
                }
              />
            )}
          </div>
          <p className="workspace-muted">
            המידע כאן נשמר בנפרד מהתכנון החודשי. סכומים מתעדכנים כשאתה עורך
            אותם.
          </p>
        </>
      )}
      {(save.isError || remove.isError) && (
        <p role="alert" className="m3-error">
          {save.error?.message ?? remove.error?.message}
        </p>
      )}
      <BottomSheet
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setInitial(null);
        }}
        title={draft?.id ? "עריכת פריט" : "פריט חדש"}
        dirty={
          !!draft &&
          !!initial &&
          JSON.stringify(draft) !== JSON.stringify(initial)
        }
        footer={
          draft ? (
            <button
              disabled={
                !draft.name.trim() ||
                save.isPending ||
                (draft.amount !== "" &&
                  (!Number.isFinite(Number(draft.amount)) ||
                    Number(draft.amount) < 0))
              }
              onClick={() => save.mutate(draft)}
              className="m3-btn-primary min-h-12 w-full"
            >
              {save.isPending ? "שומר…" : "שמירת הפריט"}
            </button>
          ) : undefined
        }
      >
        {draft && <Form draft={draft} setDraft={setDraft} />}
      </BottomSheet>
    </div>
  );
}
function Form({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (value: Draft) => void;
}) {
  return (
    <div className="grid gap-4">
      <label>
        <span className="m3-label">סוג</span>
        <select
          className="m3-input mt-1 w-full px-3 py-3"
          value={draft.kind}
          onChange={(e) =>
            setDraft({ ...draft, kind: e.target.value as FinancialItemKind })
          }
        >
          {(Object.keys(labels) as FinancialItemKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {labels[kind]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="m3-label">שם</span>
        <input
          className="m3-input mt-1 w-full px-3 py-3"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="למשל: חשבון עו״ש"
        />
      </label>
      <label>
        <span className="m3-label">בנק / גוף מנהל</span>
        <input
          className="m3-input mt-1 w-full px-3 py-3"
          value={draft.institution}
          onChange={(e) => setDraft({ ...draft, institution: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="m3-label">סכום</span>
          <input
            type="number"
            inputMode="decimal"
            dir="ltr"
            className="m3-input mt-1 w-full px-3 py-3"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            placeholder="אופציונלי"
          />
        </label>
        <label>
          <span className="m3-label">תאריך לתזכורת</span>
          <input
            type="date"
            className="m3-input mt-1 w-full px-3 py-3"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
        </label>
      </div>
      <label>
        <span className="m3-label">הערה</span>
        <textarea
          className="m3-input mt-1 min-h-24 w-full px-3 py-3"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </label>
    </div>
  );
}

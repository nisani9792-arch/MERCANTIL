"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarClock,
  Edit3,
  Plus,
  Power,
  MoreHorizontal,
  CopyPlus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { useMonthStore } from "@/stores/useMonthStore";
import { PageHeading, StatCard } from "@/components/ui/Workspace";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { incomeAmountInput } from "@/lib/ledger/income-amount";
import {formatMonthLabel} from "@/lib/utils/month";
import { formatCurrency } from "@/lib/utils/format";
import type { RecurringTemplate } from "@/types/ledger";

type Draft = {
  id?: string;
  name: string;
  amount: string;
  type: "income" | "expense";
  frequency: "monthly" | "bi-monthly";
  dayOfMonth: string;
  startMonth: string;
  isActive: boolean;
  isVariable: boolean;
};
const EMPTY_DRAFT: Draft = {
  name: "",
  amount: "",
  type: "expense",
  frequency: "monthly",
  dayOfMonth: "",
  startMonth: "",
  isActive: true,
  isVariable: false,
};

export function TemplateList({ pickerOnly = false, onLoaded }: { pickerOnly?: boolean; onLoaded?: (created: number) => void } = {}) {
  const qc = useQueryClient();
  const monthKey = useMonthStore((s) => s.monthKey);
  const addToMonth = useMutation({
    mutationFn: async ({ ids, copyAmountIds }: { ids: string[]; copyAmountIds?: string[] }) => {
      const res = await fetch("/api/ledger/init-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey, templateIds: ids, copyAmountIds }),
      });
      if (!res.ok) throw new Error("ההוספה לא אושרה");
      return res.json() as Promise<{ created: number }>;
    },
    onSuccess: async (result) => {
      setLoadingTemplate(false);
      setMessage(
        result.created
          ? `נוספו ${result.created} פריטים לחודש הנבחר`
          : "הפריט כבר קיים בחודש או שאינו חל בו לפי התדירות",
      );
      onLoaded?.(result.created);
      void Promise.all(
        ["ledger", "analytics", "ledger-history"].map((key) =>
          qc.invalidateQueries({ queryKey: [key, monthKey] }),
        ),
      );
    },
  });
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[] | null>(pickerOnly ? null : []);
  const [copyAmounts, setCopyAmounts] = useState<string[] | null>(pickerOnly ? null : []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [initialDraft, setInitialDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ templates: RecurringTemplate[] }>;
    },
  });
  const saveMut = useMutation({
    mutationFn: async (value: Draft) => {
      const res = await fetch(
        value.id ? `/api/templates/${value.id}` : "/api/templates",
        {
          method: value.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: value.name.trim(),
            type: value.type,
            amount: Number(value.amount),
            amountPending:
              value.type === "income" && value.amount.trim() === "",
            frequency: value.frequency,
            startMonth: value.startMonth || null,
            dayOfMonth: value.dayOfMonth ? Number(value.dayOfMonth) : null,
            isActive: value.isActive,
            isVariable: value.isVariable,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        template?: RecurringTemplate;
        error?: string;
      };
      if (!res.ok || !data.template)
        throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
    },
    onSuccess: async () => {
      setDraft(null);
      setInitialDraft(null);
      setMessage("נשמר בהצלחה");
      await qc.invalidateQueries({ queryKey: ["templates"] });
      window.setTimeout(() => setMessage(""), 2200);
    },
  });
  const actionMut = useMutation({
    mutationFn: async ({
      id,
      method,
      body,
    }: {
      id: string;
      method: "PATCH" | "DELETE";
      body?: object;
    }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error("action failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });

  const templates = data?.templates ?? [];
  const applicable = templates.filter((item) => item.is_active &&
    (item.frequency === "monthly" || ((!item.start_month || item.start_month <= monthKey) && Number(monthKey.slice(5)) % 2 === (item.start_month ? Number(item.start_month.slice(5)) % 2 : 1))));
  const eligible = Array.from(new Map(
    [...applicable].sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""))
      .map((item) => [JSON.stringify([item.name.trim().toLocaleLowerCase(), item.type, item.is_variable]), item]),
  ).values());
  const selectedIds = (selectedTemplates ?? eligible.map(item => item.id)).filter((id) => eligible.some((item) => item.id === id));
  const amountIds = copyAmounts ?? eligible.filter(item => item.type === "expense" && !item.is_variable && !item.amount_pending).map(item => item.id);
  const income = templates.filter(
    (item) => item.type === "income" && item.name.includes(search.trim()),
  );
  const expenses = templates.filter(
    (item) => item.type === "expense" && item.name.includes(search.trim()),
  );
  const monthly = (items: RecurringTemplate[]) =>
    items
      .filter((item) => item.is_active)
      .reduce(
        (sum, item) =>
          sum + item.amount / (item.frequency === "bi-monthly" ? 2 : 1),
        0,
      );
  const activeIncome = monthly(templates.filter((i) => i.type === "income"));
  const activeExpenses = monthly(templates.filter((i) => i.type === "expense"));
  const openDraft = (value: Draft) => {
    setDraft(value);
    setInitialDraft(value);
  };
  const edit = (item: RecurringTemplate) =>
    openDraft({
      id: item.id,
      name: item.name,
      amount: incomeAmountInput(item),
      type: item.type,
      frequency: item.frequency,
      startMonth: item.start_month ?? "",
      dayOfMonth: item.day_of_month ? String(item.day_of_month) : "",
      isActive: item.is_active,
      isVariable: item.is_variable,
    });
  const groupProps = {
    onAdd: (item: RecurringTemplate) => addToMonth.mutate({ ids: [item.id] }),
    adding: addToMonth.isPending,
    onEdit: edit,
    onToggle: (item: RecurringTemplate) =>
      actionMut.mutate({
        id: item.id,
        method: "PATCH",
        body: { isActive: !item.is_active },
      }),
    onDelete: (item: RecurringTemplate) =>
      window.confirm(`למחוק את ${item.name}?`) &&
      actionMut.mutate({ id: item.id, method: "DELETE" }),
  };

  const loadButton = (
          <button className="m3-btn-primary min-h-11 w-full"
            disabled={addToMonth.isPending || selectedIds.length === 0}
            onClick={() => addToMonth.mutate({ ids: selectedIds, copyAmountIds: amountIds.filter((id) => selectedIds.includes(id)) })}>
            {addToMonth.isPending ? "טוען…" : `הוספת ${selectedIds.length} פריטים לחודש`}
          </button>
  );
  const pickerContent = (<>
        <p className="mb-4 text-sm text-on-surface-variant">
          בחר מה להוסיף ל{formatMonthLabel(monthKey)}. סמן ״העתקת סכום״ רק כשצריך לשמור את המספר מהתבנית.
          משכורות והוצאות משתנות ממתינות כברירת מחדל לסכום חדש.
        </p>
        {applicable.length > eligible.length && <p className="mb-2 text-xs text-on-surface-variant">פריטים כפולים בתבנית מוצגים פעם אחת, לפי העדכון האחרון. התבנית המקורית נשמרת.</p>}
        <button type="button" className="min-h-11 text-sm font-bold text-primary"
          disabled={addToMonth.isPending}
          onClick={() => setSelectedTemplates(selectedIds.length === eligible.length ? [] : eligible.map((item) => item.id))}>
          {selectedIds.length === eligible.length ? "ניקוי הבחירה" : "בחירת הכול"}
        </button>
        <div className="divide-y divide-outline-variant">
          {eligible.map((item) => (
            <div key={item.id} className="flex flex-wrap min-h-16 items-center gap-3 py-3">
              <label className="flex min-w-0 flex-1 items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-primary"
                checked={selectedIds.includes(item.id)} disabled={addToMonth.isPending}
                onChange={() => setSelectedTemplates((ids) => (ids ?? selectedIds).includes(item.id) ? (ids ?? selectedIds).filter((id) => id !== item.id) : [...(ids ?? selectedIds), item.id])} />
              <span className="min-w-0 flex-1"><b className="block text-sm">{item.name}</b>
                <span className="text-xs text-on-surface-variant">{item.type === "income" ? "הכנסה" : "הוצאה"}</span>
              </span>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-xs">
                <input type="checkbox" className="h-5 w-5 accent-primary"
                  aria-label={`העתקת סכום עבור ${item.name}`}
                  checked={amountIds.includes(item.id)}
                  disabled={!selectedIds.includes(item.id) || !!item.amount_pending || addToMonth.isPending}
                  onChange={() => setCopyAmounts((ids) => (ids ?? amountIds).includes(item.id) ? (ids ?? amountIds).filter((id) => id !== item.id) : [...(ids ?? amountIds), item.id])} />
                {item.amount_pending ? "סכום להשלמה" : `העתקת סכום ${formatCurrency(item.amount)}`}
              </label>
            </div>
          ))}
        </div>
        {addToMonth.isError && <p role="alert" className="text-sm text-error">הטעינה נכשלה. הבחירה נשמרה ואפשר לנסות שוב.</p>}

  </>);
  if (pickerOnly) return <section className="month-template-picker">
    {isLoading ? <p role="status">טוען את התבנית…</p> : isError ? <p role="alert">לא הצלחנו לטעון את התבנית. סגור ונסה שוב.</p> : eligible.length ? <>{pickerContent}<div className="sticky bottom-0 bg-surface-container-lowest py-3">{loadButton}</div></> : <p className="workspace-muted">עדיין אין פריטים קבועים בתבנית לחודש הזה.</p>}
    {message && <p role="status">{message}</p>}
    <Link href="/templates" className="mt-4 inline-flex min-h-11 items-center text-sm text-primary">עריכת הפריטים הקבועים ←</Link>
  </section>;
  return (
    <div className="workspace-page">
      <PageHeading
        title="תבנית חודשית"
        description="ספרייה לשימוש חוזר. בחירת הפריטים לכל חודש נעשית בידיך."
        action={
          <button
            onClick={() => openDraft({ ...EMPTY_DRAFT })}
            className="workspace-button workspace-button-primary"
          >
            <Plus className="h-4 w-4" />
            פריט קבוע חדש
          </button>
        }
      />
      <div className="workspace-tabs">
        <Link href="/library">מחודשים קודמים</Link>
        <Link href="/templates" aria-current="page">
          תבנית חודשית
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="ממוצע הכנסות בתבניות הפעילות"
          value={
            templates.some(
              (i) => i.type === "income" && i.is_active && !i.amount_pending,
            )
              ? activeIncome
              : null
          }
          note="לפי הסכומים הידועים בספרייה"
        />
        <StatCard
          label="ממוצע הוצאות בתבניות הפעילות"
          value={activeExpenses}
          note="תדירות דו־חודשית מחושבת כחצי סכום"
        />
      </div>
      <div className="workspace-toolbar">
        <div className="workspace-month-picker">
          <MonthNavigator />
        </div>
        <button
          className="workspace-button workspace-button-primary"
          disabled={isLoading || isError || eligible.length === 0 || addToMonth.isPending}
          onClick={() => {
            setSelectedTemplates(eligible.map((item) => item.id));
            setCopyAmounts(eligible.filter((item) => item.type === "expense" && !item.is_variable && !item.amount_pending).map((item) => item.id));
            addToMonth.reset();
            setLoadingTemplate(true);
          }}
        >
          <CopyPlus className="h-4 w-4" /> טעינת חודש מתבנית
        </button>
      </div>
      {addToMonth.isError && (
        <p role="alert" className="m3-error">
          ההוספה נכשלה. אפשר לנסות שוב.
        </p>
      )}
      <label className="workspace-search">
        <input
          aria-label="חיפוש בפריטים קבועים"
          placeholder="חיפוש פריט קבוע"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-success-container px-4 py-3 text-sm font-bold text-success"
        >
          {message}
        </p>
      )}
      {(isError || saveMut.isError || actionMut.isError) && (
        <p role="alert" className="m3-error rounded-xl bg-error-container p-3">
          הפעולה נכשלה. אפשר לנסות שוב.
        </p>
      )}
      {isLoading && (
        <p className="py-10 text-center text-sm text-on-surface-variant">
          טוען תכנון...
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <TemplateGroup
          title="הכנסות קבועות"
          subtitle="משכורות והכנסות שחוזרות"
          items={income}
          kind="income"
          {...groupProps}
        />
        <TemplateGroup
          title="הוצאות קבועות"
          subtitle="חשבונות והתחייבויות"
          items={expenses}
          kind="expense"
          {...groupProps}
        />
      </div>
      <BottomSheet
        key={monthKey}
        open={loadingTemplate}
        onClose={() => { if (!addToMonth.isPending) setLoadingTemplate(false); }}
        title="טעינת חודש מתבנית"
        footer={loadButton}
      >
        {pickerContent}
      </BottomSheet>
      <BottomSheet
        open={Boolean(draft)}
        onClose={() => {
          setDraft(null);
          setInitialDraft(null);
        }}
        title={draft?.id ? "עריכת פריט קבוע" : "פריט קבוע חדש"}
        dirty={Boolean(
          draft &&
            initialDraft &&
            JSON.stringify(draft) !== JSON.stringify(initialDraft),
        )}
        footer={
          draft ? (
            <TemplateSaveButton
              draft={draft}
              saving={saveMut.isPending}
              onSave={() => saveMut.mutate(draft)}
            />
          ) : undefined
        }
      >
        {draft && (
          <TemplateForm
            draft={draft}
            setDraft={setDraft}
            error={saveMut.isError ? saveMut.error.message : undefined}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function TemplateGroup({
  title,
  subtitle,
  items,
  kind,
  onEdit,
  onToggle,
  onDelete,
  onAdd,
  adding,
}: {
  title: string;
  subtitle: string;
  items: RecurringTemplate[];
  kind: "income" | "expense";
  onEdit: (item: RecurringTemplate) => void;
  onToggle: (item: RecurringTemplate) => void;
  onDelete: (item: RecurringTemplate) => void;
  onAdd: (item: RecurringTemplate) => void;
  adding: boolean;
}) {
  const Icon = kind === "income" ? BanknoteArrowDown : BanknoteArrowUp;
  return (
    <section className="finance-panel !p-0">
      <div className="flex items-center gap-3 border-b border-outline-variant p-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${kind === "income" ? "bg-success-container text-success" : "bg-primary-container text-primary"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-outline-variant">
        {items.map((item) => (
          <article
            key={item.id}
            className={`flex items-center gap-2 p-3 sm:gap-3 sm:p-4 ${item.is_active ? "" : "opacity-45"}`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-start"
              onClick={() => onEdit(item)}
            >
              <p className="truncate text-sm font-bold">{item.name}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                <CalendarClock className="h-3.5 w-3.5" />
                {item.frequency === "monthly" ? "כל חודש" : "כל חודשיים"}
                {item.day_of_month ? ` · ביום ${item.day_of_month}` : ""}
              </p>
            </button>
            <strong className="text-sm" dir="ltr">
              {item.amount_pending
                ? "טרם הוזן סכום"
                : formatCurrency(item.amount)}
            </strong>
            <button
              type="button"
              disabled={adding || !item.is_active}
              onClick={() => onAdd(item)}
              aria-label={"הוספת " + item.name + " לחודש"}
              title="הוספה לחודש הנבחר"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary-container disabled:opacity-30"
            >
              <CopyPlus className="h-4 w-4" />
            </button>
            <details className="relative">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-on-surface-variant"
                aria-label={"פעולות עבור " + item.name}
              >
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute end-0 top-10 z-20 w-40 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-elevation-2">
                <button
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-container"
                  onClick={() => onEdit(item)}
                >
                  <Edit3 className="h-4 w-4" />
                  עריכה
                </button>
                <button
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-container"
                  onClick={() => onToggle(item)}
                >
                  <Power className="h-4 w-4" />
                  {item.is_active ? "השהיה" : "הפעלה"}
                </button>
                <button
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-error"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                  מחיקה
                </button>
              </div>
            </details>
          </article>
        ))}
        {!items.length && (
          <p className="p-8 text-center text-sm text-on-surface-variant">
            אין עדיין פריטים
          </p>
        )}
      </div>
    </section>
  );
}
function TemplateForm({
  draft,
  setDraft,
  error,
}: {
  draft: Draft;
  setDraft: (value: Draft) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-error-container p-3 text-sm font-semibold text-error"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-container p-1">
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                type,
                isVariable: type === "income" ? false : draft.isVariable,
              })
            }
            className={`min-h-11 rounded-xl text-sm font-bold ${draft.type === type ? "bg-surface-container-lowest text-primary shadow-elevation-1" : "text-on-surface-variant"}`}
          >
            {type === "expense" ? "הוצאה" : "הכנסה"}
          </button>
        ))}
      </div>
      <label>
        <span className="m3-label">שם הפריט</span>
        <input
          className="m3-input mt-1 w-full px-3 py-3"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="למשל: שכירות"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="m3-label">סכום</span>
          <input
            className="m3-input mt-1 w-full px-3 py-3"
            type="number"
            inputMode="decimal"
            dir="ltr"
            placeholder={
              draft.type === "income" ? "למילוי בכל חודש" : undefined
            }
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
          />
        </label>
        <label>
          <span className="m3-label">יום בחודש</span>
          <input
            className="m3-input mt-1 w-full px-3 py-3"
            type="number"
            min="1"
            max="31"
            inputMode="numeric"
            dir="ltr"
            value={draft.dayOfMonth}
            onChange={(e) => setDraft({ ...draft, dayOfMonth: e.target.value })}
            placeholder="אופציונלי"
          />
        </label>
      </div>
      <label>
        <span className="m3-label">תדירות</span>
        <select
          className="m3-input mt-1 w-full px-3 py-3"
          value={draft.frequency}
          onChange={(e) =>
            setDraft({
              ...draft,
              frequency: e.target.value as Draft["frequency"],
            })
          }
        >
          <option value="monthly">כל חודש</option>
          <option value="bi-monthly">כל חודשיים</option>
        </select>
      </label>
      {draft.frequency === "bi-monthly" && <label>
        <span className="m3-label">חודש ראשון במחזור</span>
        <input type="month" className="m3-input mt-1 w-full px-3 py-3" value={draft.startMonth}
          onChange={(event) => setDraft({...draft, startMonth: event.target.value})}/>
        <small>התשלום יחול בחודש שבחרת ובכל חודשיים אחריו. ריק שומר את המחזור הקיים של חודשים אי־זוגיים.</small>
      </label>}
      {draft.type === "expense" && (
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-container/50 px-3 text-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-primary"
            checked={draft.isVariable}
            onChange={(e) =>
              setDraft({ ...draft, isVariable: e.target.checked })
            }
          />
          הוצאה משתנה (תקציב משוער)
        </label>
      )}
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-container/50 px-3 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={draft.isActive}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
        />
        זמין לבחירה בספרייה
      </label>
    </div>
  );
}

function TemplateSaveButton({
  draft,
  saving,
  onSave,
}: {
  draft: Draft;
  saving: boolean;
  onSave: () => void;
}) {
  const day = draft.dayOfMonth ? Number(draft.dayOfMonth) : null;
  const valid =
    Boolean(draft.name.trim()) &&
    (draft.type === "income" || draft.amount.trim() !== "") &&
    Number.isFinite(Number(draft.amount)) &&
    Number(draft.amount) >= 0 &&
    (day === null || (day >= 1 && day <= 31));
  return (
    <button
      type="button"
      disabled={!valid || saving}
      onClick={onSave}
      className="m3-btn-primary min-h-[54px] w-full shadow-elevation-1"
    >
      {saving ? "שומר שינויים…" : "שמירת השינויים"}
    </button>
  );
}

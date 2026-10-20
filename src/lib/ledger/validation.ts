import { z } from "zod";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const text = (max: number) => z.string().trim().min(1).max(max);

export const ledgerCreateSchema = z.object({
  monthKey: monthKey.optional(),
  name: text(120),
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().min(0).max(10_000_000),
  isVariable: z.boolean().optional(),
  category: text(80).optional(),
  notes: z.string().trim().max(2_000).optional(),
  entryKind: z.enum(["transaction", "cash_withdrawal"]).optional(),
  paymentMethod: z.enum(["bank", "card", "cash"]).optional(),
  dueDate: dueDate.optional(),
}).strict();

export const ledgerUpdateSchema = z.object({
  name: text(120).optional(),
  amount: z.number().finite().min(0).max(10_000_000).optional(),
  category: text(80).optional(),
  notes: z.string().trim().max(2_000).nullable().optional(),
  isPaid: z.boolean().optional(),
  paymentMethod: z.enum(["bank", "card", "cash"]).optional(),
  isVariable: z.boolean().optional(),
  dueDate: dueDate.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "נדרש לפחות שדה אחד לעדכון");

export const categoryOrderSchema = z.object({
  monthKey,
  categoryOrder: z.array(text(80)).max(30),
}).strict();

export const monthTemplateSchema = z.object({ monthKey }).strict();

export const ledgerRolloverSchema = z.object({
  targetMonthKey: monthKey,
}).strict();

export const ledgerPeriodCorrectionSchema = z.object({
  sourceMonthKey: monthKey,
  targetMonthKey: monthKey,
}).strict();

export const entryTemplateSchema = z.object({
  frequency: z.enum(["monthly", "bi-monthly"]),
  dayOfMonth: z.number().int().min(1).max(31).nullable(),
}).strict();

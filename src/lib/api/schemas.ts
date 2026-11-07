import {z} from "zod";
export const uuid = z.string().uuid();
export function isDate(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export const date = z.string().refine(isDate,"תאריך אינו תקין");
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(v=>Number(v.slice(0,4))>0);
export const amount = z.number().finite().min(0).max(10_000_000).refine(v=>Math.abs(v*100-Math.round(v*100))<0.000001,"יש להזין עד שתי ספרות אחרי הנקודה");
const name = z.string().trim().min(1).max(120);
const type = z.enum(["income","expense"]);
export const categoryCreate = z.object({name,type,icon:z.string().trim().max(40).optional()}).strict();
const templateFields = z.object({name,type,amount,amountPending:z.boolean().optional(),frequency:z.enum(["monthly","bi-monthly"]).optional(),dayOfMonth:z.number().int().min(1).max(31).nullable().optional(),isActive:z.boolean().optional(),isVariable:z.boolean().optional()}).strict();
export const templateCreate = templateFields.refine(v=>!v.amountPending || v.amount===0,"סכום חסר אינו יכול לכלול מספר");
export const templateUpdate = templateFields.partial().refine(v=>Object.keys(v).length>0).refine(v=>!v.amountPending || v.amount===undefined || v.amount===0);
export const transactionCreate = z.object({amount:amount.refine(v=>v>0),date,categoryId:uuid,accountSource:z.string().trim().max(120).optional(),notes:z.string().trim().max(2000).optional(),isFixedRecurring:z.boolean().optional(),recurringDayOfMonth:z.number().int().min(1).max(31).nullable().optional()}).strict();
export const transactionUpdate = z.object({categoryId:uuid.optional(),isFixedRecurring:z.boolean().optional(),recurringDayOfMonth:z.number().int().min(1).max(31).nullable().optional()}).strict().refine(v=>Object.keys(v).length>0);

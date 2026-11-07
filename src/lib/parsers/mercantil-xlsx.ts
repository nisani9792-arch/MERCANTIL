import {createHash} from "node:crypto";
import {isDate, amount as validAmount} from "@/lib/api/schemas";
import {validateXlsxArchive} from "./xlsx-limits";
import ExcelJS from "exceljs";
import { isRelevantTransaction } from "@/lib/filters/household-relevance";

export type MercantilBankRow = {
  date: string;
  valueDate: string;
  description: string;
  amount: number;
  balance: number;
  reference: string;
  channel: string;
};

function cellToDate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0,10);
  if (typeof value === "number" && Number.isFinite(value) && value > 0 && value < 2958466) return new Date(Date.UTC(1899,11,30)+Math.round(value*86400000)).toISOString().slice(0,10);
  if (typeof value === "string") {
    const text=value.trim();
    if(isDate(text))return text;
    const parts=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if(parts){const iso=`${parts[3]}-${parts[2].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;if(isDate(iso))return iso;}
  }
  throw new Error("אחד מתאריכי התנועות אינו תקין. לא בוצע ייבוא.");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "richText" in (value as object)) {
    return (value as { richText: { text: string }[] }).richText
      .map((r) => r.text)
      .join("");
  }
  return String(value).trim();
}

function cellToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Parse Mercantil / Israeli bank "עובר ושב" xlsx export */
export async function parseMercantilXlsx(
  buffer: ArrayBuffer | Buffer,
): Promise<{ accountHolder?: string; accountNumber?: string; rows: MercantilBankRow[] }> {
  validateXlsxArchive(buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer);
  const wb = new ExcelJS.Workbook();
  // @ts-expect-error exceljs accepts Buffer
  await wb.xlsx.load(buffer);

  const sheet = wb.worksheets[0];
  if (!sheet) return { rows: [] };
  if(sheet.rowCount>10000)throw new Error("הקובץ מכיל יותר מדי שורות");

  let accountHolder: string | undefined;
  let accountNumber: string | undefined;

  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const c1 = cellToString(row.getCell(1).value);
    const c2 = cellToString(row.getCell(2).value);
    if (c1.includes("חשבון") && c2) accountNumber = c2;
    if (c2 && /^[A-Z\u0590-\u05FF\s]+$/i.test(c2) && c1.includes("חשבון")) {
      accountHolder = c2;
    }
    if (c1.includes("חשבון:")) {
      const parts = c1.split(":");
      accountNumber = parts[1]?.trim();
      accountHolder = c2 || undefined;
    }
  }

  // Row 3 often: "חשבון: 0086851839" | "SHIN"
  const r3c1 = cellToString(sheet.getRow(3).getCell(1).value);
  const r3c2 = cellToString(sheet.getRow(3).getCell(2).value);
  if (r3c1.includes("חשבון")) {
    accountNumber = r3c1.replace(/.*:/, "").trim();
    accountHolder = r3c2 || accountHolder;
  }

  const rows: MercantilBankRow[] = [];
  let headerRow = 8;
  for (let r = 1; r <= 15; r++) {
    const c3 = cellToString(sheet.getRow(r).getCell(3).value);
    if (c3.includes("תיאור")) {
      headerRow = r;
      break;
    }
  }

  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const description = cellToString(row.getCell(3).value);
    const amount = cellToNumber(row.getCell(4).value);
    if (!description || amount === 0) continue;
    if (!validAmount.safeParse(Math.abs(amount)).success) throw new Error("אחד הסכומים אינו תקין. לא בוצע ייבוא.");
    if (description.length>2000) throw new Error("תיאור תנועה ארוך מדי");
    if (!isRelevantTransaction(description)) continue;

    rows.push({
      date: cellToDate(row.getCell(1).value),
      valueDate: row.getCell(2).value == null ? cellToDate(row.getCell(1).value) : cellToDate(row.getCell(2).value),
      description,
      amount,
      balance: cellToNumber(row.getCell(5).value),
      reference: cellToString(row.getCell(6).value),
      channel: cellToString(row.getCell(8).value),
    });
  }

  return { accountHolder, accountNumber, rows };
}

export function mercantilImportHash(row: MercantilBankRow): string {
  return createHash("sha256").update(`${row.date}|${row.amount}|${row.description}|${row.reference}`).digest("hex");
}

export function legacyMercantilImportHash(row: MercantilBankRow) { return `${row.date}|${row.amount}|${row.description}|${row.reference}`.slice(0,200); }

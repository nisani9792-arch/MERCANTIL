/**
 * Mercantil is a household budget tool — not a bank mirror.
 * Filters noise (temporary card holds) from learning and summaries.
 */

const IRRELEVANT_PATTERNS: RegExp[] = [
  /חיוב\s*זמני/i,
  /temporary\s*charge/i,
  /hold\s*charge/i,
];

export function isRelevantTransaction(description: string): boolean {
  const text = description.trim();
  if (!text) return false;
  return !IRRELEVANT_PATTERNS.some((p) => p.test(text));
}

export function isRelevantNotes(notes: string | null | undefined): boolean {
  if (!notes) return true;
  return isRelevantTransaction(notes);
}

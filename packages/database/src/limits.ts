export const DOCUMENTS_PER_DAY = Number(process.env.DOCUMENTS_PER_DAY ?? 5);
export const QUESTIONS_PER_DAY = Number(process.env.QUESTIONS_PER_DAY ?? 25);
export const MAX_PDF_PAGES = Number(process.env.MAX_PDF_PAGES ?? 100);
export const MAX_PDF_SIZE_BYTES =
  Number(process.env.MAX_PDF_SIZE_MB ?? 10) * 1024 * 1024;

export const UNLIMITED_PLANS = new Set(["pro", "unlimited"]);

export function isUnlimitedPlan(plan: string): boolean {
  return UNLIMITED_PLANS.has(plan);
}

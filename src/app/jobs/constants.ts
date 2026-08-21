export const JOBS_PAGE_SIZE = 25;
export const MAX_AGE_DAYS_LIMIT = 28;

export function parseMaxAgeDays(maxAge: string | undefined): number | undefined {
  if (!maxAge) return undefined;
  const parsed = Number(maxAge);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= MAX_AGE_DAYS_LIMIT) return undefined;
  return Math.floor(parsed);
}

export function parseTitleQuery(title: string | undefined): string | undefined {
  const trimmed = title?.trim();
  return trimmed ? trimmed : undefined;
}

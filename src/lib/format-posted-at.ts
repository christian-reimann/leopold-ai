const relativeTimeFormat = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });

export function formatPostedAt(postedAt?: string): string | null {
  if (!postedAt) return null;
  const date = new Date(postedAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays < 14) {
    return relativeTimeFormat.format(-diffDays, 'day');
  }
  if (diffDays < 60) {
    return relativeTimeFormat.format(-Math.floor(diffDays / 7), 'week');
  }
  return relativeTimeFormat.format(-Math.floor(diffDays / 30), 'month');
}

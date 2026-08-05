import type { ApplicationColorScheme } from '@/shared/schemas/application';

export const COLOR_SCHEMES: Record<ApplicationColorScheme, { accent: string; accentSoft: string }> = {
  slate: { accent: '#334155', accentSoft: '#e2e8f0' },
  blue: { accent: '#1d4ed8', accentSoft: '#dbeafe' },
  emerald: { accent: '#047857', accentSoft: '#d1fae5' },
  burgundy: { accent: '#9f1239', accentSoft: '#fce7f3' },
};

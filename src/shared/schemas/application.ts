import { z } from 'zod';

export const APPLICATION_TONES = ['formal', 'neutral', 'confident', 'creative'] as const;
export const ApplicationToneSchema = z.enum(APPLICATION_TONES);
export type ApplicationTone = z.infer<typeof ApplicationToneSchema>;

export const PERSONALITY_TRAITS = [
  'analytical',
  'creative',
  'team_oriented',
  'results_oriented',
  'empathetic',
  'down_to_earth',
] as const;
export const PersonalityTraitSchema = z.enum(PERSONALITY_TRAITS);
export type PersonalityTrait = z.infer<typeof PersonalityTraitSchema>;

export const APPLICATION_LANGUAGES = ['de', 'en'] as const;
export const ApplicationLanguageSchema = z.enum(APPLICATION_LANGUAGES);
export type ApplicationLanguage = z.infer<typeof ApplicationLanguageSchema>;

export const APPLICATION_LAYOUT_IDS = ['standard'] as const;
export const ApplicationLayoutIdSchema = z.enum(APPLICATION_LAYOUT_IDS);
export type ApplicationLayoutId = z.infer<typeof ApplicationLayoutIdSchema>;

export const APPLICATION_COLOR_SCHEMES = ['slate', 'blue', 'emerald', 'burgundy'] as const;
export const ApplicationColorSchemeSchema = z.enum(APPLICATION_COLOR_SCHEMES);
export type ApplicationColorScheme = z.infer<typeof ApplicationColorSchemeSchema>;

export const APPLICATION_STATUSES = ['draft', 'final', 'submitted'] as const;
export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationOptionsSchema = z.object({
  tone: ApplicationToneSchema,
  personality: z.array(PersonalityTraitSchema),
  language: ApplicationLanguageSchema,
  layoutTemplate: ApplicationLayoutIdSchema,
  colorScheme: ApplicationColorSchemeSchema,
});
export type ApplicationOptions = z.infer<typeof ApplicationOptionsSchema>;

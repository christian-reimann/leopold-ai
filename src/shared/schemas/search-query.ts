import { z } from 'zod';
import { EmploymentTypeSchema } from './job-posting';

export const NOTIFICATION_INTERVALS = ['instant', 'daily'] as const;
export const NotificationIntervalSchema = z.enum(NOTIFICATION_INTERVALS);
export type NotificationInterval = z.infer<typeof NotificationIntervalSchema>;

export const SearchCriteriaSchema = z.object({
  keywords: z.array(z.string()),
  location: z.string().optional(),
  radiusKm: z.number().optional(),
  remote: z.boolean().optional(),
  employmentTypes: z.array(EmploymentTypeSchema).optional(),
  // Empty/undefined = search all registered connectors.
  connectors: z.array(z.string()).optional(),
});
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;

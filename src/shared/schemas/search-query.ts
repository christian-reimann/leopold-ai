import { z } from "zod";
import { EmploymentTypeSchema } from "./job-posting.js";

export const NOTIFICATION_INTERVALS = ["instant", "daily"] as const;
export const NotificationIntervalSchema = z.enum(NOTIFICATION_INTERVALS);
export type NotificationInterval = z.infer<typeof NotificationIntervalSchema>;

export const SearchCriteriaSchema = z.object({
  keywords: z.array(z.string()),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  employmentTypes: z.array(EmploymentTypeSchema).optional(),
});
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;

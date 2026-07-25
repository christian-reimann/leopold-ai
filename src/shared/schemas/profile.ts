import { z } from "zod";

export const PROFILE_SOURCES = ["extracted", "manual"] as const;
export const ProfileSourceSchema = z.enum(PROFILE_SOURCES);
export type ProfileSource = z.infer<typeof ProfileSourceSchema>;

export const ExperienceSchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string(), // "YYYY-MM"
  endDate: z.string().nullable(), // null = aktuell
  description: z.string().optional(),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  startDate: z.string(), // "YYYY-MM"
  endDate: z.string().nullable(),
});
export type Education = z.infer<typeof EducationSchema>;

export const ProfileSchema = z.object({
  name: z.string(),
  email: z.email().optional(),
  phone: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;

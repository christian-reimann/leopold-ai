import { z } from 'zod';

export const PROFILE_SOURCES = ['extracted', 'manual'] as const;
export const ProfileSourceSchema = z.enum(PROFILE_SOURCES);
export type ProfileSource = z.infer<typeof ProfileSourceSchema>;

export const PROFILE_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
export const ProfileStatusSchema = z.enum(PROFILE_STATUSES);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const AddressSchema = z.object({
  street: z.string(),
  zipcode: z.string(),
  location: z.string(),
  country: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const ContactSchema = z.object({
  email: z.email(),
  phone: z.string(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  homepage: z.string().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ProjectSchema = z.object({
  title: z.string(),
  client: z.string().optional(),
  startDate: z.string(), // "MM.YYYY" oder "YYYY"
  endDate: z.string().optional(),
  description: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary'] as const;
export const EmploymentTypeSchema = z.enum(EMPLOYMENT_TYPES);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const ExperienceSchema = z.object({
  role: z.string(),
  company: z.string().optional(),
  employmentType: EmploymentTypeSchema,
  startDate: z.string(), // "MM.YYYY" oder "YYYY"
  endDate: z.string().optional(),
  description: z.string(),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  startDate: z.string(), // "MM.YYYY" oder "YYYY"
  endDate: z.string().optional(),
  description: z.string(),
});
export type Education = z.infer<typeof EducationSchema>;

export const InterestSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type Interest = z.infer<typeof InterestSchema>;

export const StrengthSchema = z.object({
  name: z.string(),
  description: z.string(),
});
export type Strength = z.infer<typeof StrengthSchema>;

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'] as const;
export const LanguageLevelSchema = z.enum(LANGUAGE_LEVELS);
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;

export const LanguageSkillSchema = z.object({
  language: z.string(),
  level: LanguageLevelSchema,
});
export type LanguageSkill = z.infer<typeof LanguageSkillSchema>;

export const SkillCategorySchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
});
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const ProfileSchema = z.object({
  name: z.string(),
  role: z.string(),
  address: AddressSchema,
  contact: ContactSchema,
  education: z.array(EducationSchema),
  experiences: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(SkillCategorySchema),
  strengths: z.array(StrengthSchema),
  languages: z.array(LanguageSkillSchema),
  interests: z.array(InterestSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;

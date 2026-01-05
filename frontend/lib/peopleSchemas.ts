import { z } from "zod";

export const createPersonSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  username: z.string().trim().min(1, "Username is required"),
  role: z.string().trim().optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const createPeopleRelationshipSchema = z.object({
  toPersonId: z.string().trim().min(1, "Related person is required"),
  type: z.string().trim().min(1, "Relationship type is required"),
});

export type CreatePeopleRelationshipInput = z.infer<
  typeof createPeopleRelationshipSchema
>;

export const createPeopleEmploymentSchema = z.object({
  employer: z.string().trim().min(1, "Employer is required"),
  title: z.string().trim().optional(),
  employmentType: z.string().trim().optional(),
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: z.string().trim().optional(),
  isCurrent: z.boolean().default(true),
});

export type CreatePeopleEmploymentInput = z.infer<
  typeof createPeopleEmploymentSchema
>;

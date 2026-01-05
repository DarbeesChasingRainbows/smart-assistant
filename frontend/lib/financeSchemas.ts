import { z } from "zod";

export const createFinancialAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.string().min(1, "Account type is required"),
  institution: z.string().optional(),
  accountNumber: z.string().optional(),
  currency: z.string().default("USD"),
  openingBalance: z.coerce.number().finite().default(0),
});

export type CreateFinancialAccountInput = z.infer<
  typeof createFinancialAccountSchema
>;

export const accountTypes = [
  "Checking",
  "Savings",
  "CreditCard",
  "Cash",
  "Loan",
  "Investment",
] as const;

export const createFinancialCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  type: z.enum(["Income", "Expense"]),
  parentKey: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
});

export type CreateFinancialCategoryInput = z.infer<
  typeof createFinancialCategorySchema
>;

import type { ZodError } from "zod";

export type FieldErrors = Record<string, string[]>;

export function zodToFieldErrors(error: ZodError): {
  formErrors: string[];
  fieldErrors: FieldErrors;
} {
  const flat = error.flatten();
  return {
    formErrors: flat.formErrors,
    fieldErrors: flat.fieldErrors as FieldErrors,
  };
}

export function firstError(
  fieldErrors: FieldErrors,
  field: string,
): string | null {
  const errs = fieldErrors[field];
  if (!errs || errs.length === 0) return null;
  return errs[0] ?? null;
}

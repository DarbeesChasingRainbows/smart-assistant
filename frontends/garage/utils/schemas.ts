/**
 * Zod validation schemas for Vehicle Maintenance application
 * Provides type-safe validation for all API inputs and form data
 */
import { z } from "zod";

// ============================================================================
// Common Validators
// ============================================================================

/** VIN must be exactly 17 alphanumeric characters (excluding I, O, Q) */
export const vinSchema = z
  .string()
  .length(17, "VIN must be exactly 17 characters")
  .regex(
    /^[A-HJ-NPR-Z0-9]{17}$/i,
    "VIN contains invalid characters (I, O, Q not allowed)"
  )
  .transform((val) => val.toUpperCase())
  .optional()
  .or(z.literal(""));

/** Positive integer for mileage values */
export const mileageSchema = z.coerce
  .number()
  .int("Mileage must be a whole number")
  .nonnegative("Mileage cannot be negative")
  .max(9999999, "Mileage value too large");

/** Optional positive mileage */
export const optionalMileageSchema = z
  .union([z.literal(""), z.coerce.number().int().nonnegative().max(9999999)])
  .transform((val) => (val === "" ? undefined : val));

/** Year validation (1900 to next year) */
export const yearSchema = z.coerce
  .number()
  .int("Year must be a whole number")
  .min(1900, "Year must be 1900 or later")
  .max(new Date().getFullYear() + 1, "Year cannot be in the future");

/** Positive currency amount */
export const currencySchema = z.coerce
  .number()
  .nonnegative("Amount cannot be negative")
  .max(999999.99, "Amount too large")
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

/** Optional currency */
export const optionalCurrencySchema = z
  .union([z.literal(""), z.coerce.number().nonnegative().max(999999.99)])
  .transform((val) => (val === "" ? undefined : Math.round(Number(val) * 100) / 100));

/** Positive hours value */
export const hoursSchema = z.coerce
  .number()
  .nonnegative("Hours cannot be negative")
  .max(999, "Hours value too large");

/** Optional hours */
export const optionalHoursSchema = z
  .union([z.literal(""), z.coerce.number().nonnegative().max(999)])
  .transform((val) => (val === "" ? undefined : val));

/** Date string in ISO format (YYYY-MM-DD) */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD required)")
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date");

/** Optional date */
export const optionalDateSchema = z
  .union([z.literal(""), dateSchema])
  .transform((val) => (val === "" ? undefined : val));

/** UUID validation */
export const uuidSchema = z
  .string()
  .uuid("Invalid ID format");

/** Non-empty trimmed string */
export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(255, "Value too long");

/** Optional trimmed string */
export const optionalStringSchema = z
  .string()
  .trim()
  .max(255, "Value too long")
  .transform((val) => (val === "" ? undefined : val))
  .optional();

/** Notes/description field (longer text) */
export const notesSchema = z
  .string()
  .trim()
  .max(2000, "Notes too long (max 2000 characters)")
  .transform((val) => (val === "" ? undefined : val))
  .optional();

// ============================================================================
// Vehicle Schemas
// ============================================================================

export const vehicleTypeSchema = z.enum(["car", "rv"], {
  errorMap: () => ({ message: "Vehicle type must be 'car' or 'rv'" }),
});

export const createVehicleSchema = z.object({
  vehicleType: vehicleTypeSchema,
  vin: vinSchema,
  make: requiredStringSchema.max(100, "Make too long"),
  model: requiredStringSchema.max(100, "Model too long"),
  year: yearSchema,
  trim: optionalStringSchema.pipe(z.string().max(100).optional()),
  engine: optionalStringSchema.pipe(z.string().max(100).optional()),
  transmission: optionalStringSchema.pipe(z.string().max(100).optional()),
  licensePlate: optionalStringSchema.pipe(z.string().max(20).optional()),
  color: optionalStringSchema.pipe(z.string().max(50).optional()),
  purchaseDate: optionalDateSchema,
  purchaseMileage: optionalMileageSchema,
  currentMileage: mileageSchema,
});

export const updateVehicleSchema = z.object({
  vin: vinSchema.optional(),
  currentMileage: mileageSchema.optional(),
  licensePlate: optionalStringSchema.pipe(z.string().max(20).optional()),
  color: optionalStringSchema.pipe(z.string().max(50).optional()),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  "At least one field must be provided for update"
);

// ============================================================================
// Maintenance Schedule Schemas
// ============================================================================

export const intervalTypeSchema = z.enum(["mileage", "time", "both"], {
  errorMap: () => ({ message: "Interval type must be 'mileage', 'time', or 'both'" }),
});

export const prioritySchema = z.coerce
  .number()
  .int()
  .min(1, "Priority must be at least 1")
  .max(10, "Priority cannot exceed 10");

// RV maintenance categories
export const rvMaintenanceCategorySchema = z.enum([
  "Engine",
  "Drivetrain",
  "Generator",
  "Brakes",
  "Tires",
  "Exterior",
  "Roof",
  "Slide-Outs",
  "Awning",
  "Electrical",
  "Propane",
  "Water System",
  "HVAC",
  "Refrigerator",
  "Leveling",
  "Safety",
  "Towing",
  "Winterization",
  "Interior",
  "General",
]);

export const maintenanceCategorySchema = z
  .string()
  .max(50, "Category name too long")
  .optional();

export const createMaintenanceScheduleSchema = z.object({
  vehicleId: uuidSchema,
  itemName: requiredStringSchema.max(200, "Item name too long"),
  description: notesSchema,
  intervalType: intervalTypeSchema,
  mileageInterval: optionalMileageSchema,
  timeIntervalMonths: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(120)])
    .transform((val: "" | number) => (val === "" ? undefined : val))
    .optional(),
  priority: prioritySchema.default(5),
  estimatedCost: optionalCurrencySchema,
  estimatedHours: optionalHoursSchema,
  category: maintenanceCategorySchema,
}).refine(
  (data) => {
    if (data.intervalType === "mileage" || data.intervalType === "both") {
      return data.mileageInterval !== undefined && data.mileageInterval > 0;
    }
    return true;
  },
  { message: "Mileage interval required for mileage-based schedules", path: ["mileageInterval"] }
).refine(
  (data) => {
    if (data.intervalType === "time" || data.intervalType === "both") {
      return data.timeIntervalMonths !== undefined && data.timeIntervalMonths > 0;
    }
    return true;
  },
  { message: "Time interval required for time-based schedules", path: ["timeIntervalMonths"] }
);

// ============================================================================
// Maintenance Record Schemas
// ============================================================================

export const maintenanceStatusSchema = z.enum(["pending", "completed", "overdue"], {
  errorMap: () => ({ message: "Status must be 'pending', 'completed', or 'overdue'" }),
});

export const createMaintenanceRecordSchema = z.object({
  vehicleId: uuidSchema,
  scheduleId: uuidSchema,
  maintenanceDate: dateSchema,
  mileageAtService: optionalMileageSchema,
  status: maintenanceStatusSchema.default("completed"),
  actualCost: optionalCurrencySchema,
  actualHours: optionalHoursSchema,
  serviceProvider: optionalStringSchema.pipe(z.string().max(200).optional()),
  notes: notesSchema,
  receiptUrl: z
    .string()
    .url("Invalid URL format")
    .max(500, "URL too long")
    .optional()
    .or(z.literal("")),
});

export const updateMaintenanceRecordSchema = z.object({
  maintenanceDate: dateSchema.optional(),
  mileageAtService: optionalMileageSchema,
  status: maintenanceStatusSchema.optional(),
  actualCost: optionalCurrencySchema,
  actualHours: optionalHoursSchema,
  serviceProvider: optionalStringSchema.pipe(z.string().max(200).optional()),
  notes: notesSchema,
  receiptUrl: z
    .string()
    .url("Invalid URL format")
    .max(500, "URL too long")
    .optional()
    .or(z.literal("")),
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const maintenanceRecordsQuerySchema = paginationSchema.extend({
  vehicleId: uuidSchema.optional(),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
});

export const costAnalyticsQuerySchema = z.object({
  vehicleId: uuidSchema.optional(),
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
});

// ============================================================================
// VIN Lookup Schema
// ============================================================================

export const vinLookupSchema = z.object({
  vin: z
    .string()
    .length(17, "VIN must be exactly 17 characters")
    .regex(
      /^[A-HJ-NPR-Z0-9]{17}$/i,
      "VIN contains invalid characters (I, O, Q not allowed)"
    )
    .transform((val) => val.toUpperCase()),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;
export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>;
export type UpdateMaintenanceRecordInput = z.infer<typeof updateMaintenanceRecordSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type MaintenanceRecordsQuery = z.infer<typeof maintenanceRecordsQuerySchema>;
export type CostAnalyticsQuery = z.infer<typeof costAnalyticsQuerySchema>;
export type VinLookupInput = z.infer<typeof vinLookupSchema>;
export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type IntervalType = z.infer<typeof intervalTypeSchema>;
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;
export type RvMaintenanceCategory = z.infer<typeof rvMaintenanceCategorySchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Parse and validate data, returning a result object
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a user-friendly object
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

/**
 * Get first error message from Zod error
 */
export function getFirstError(error: z.ZodError): string {
  return error.issues[0]?.message || "Validation failed";
}

/**
 * Parse FormData into an object for validation
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

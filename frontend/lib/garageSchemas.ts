import { z } from "zod";

const vehicleTypeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Truck"),
    payloadCapacity: z.coerce.number().optional(),
  }),
  z.object({
    type: z.literal("RV"),
    length: z.coerce.number().optional(),
    slideOuts: z.coerce.number().int().optional(),
  }),
  z.object({
    type: z.literal("Car"),
    bodyStyle: z.string().optional(),
  }),
  z.object({
    type: z.literal("Motorcycle"),
    engineCC: z.coerce.number().int().optional(),
  }),
]);

export const createVehicleSchema = z.object({
  vin: z
    .string()
    .trim()
    .length(17, "VIN must be exactly 17 characters")
    .transform((v) => v.toUpperCase()),
  licensePlate: z.string().trim().optional(),
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  year: z.coerce
    .number()
    .int("Year must be an integer")
    .min(1900, "Year is too small")
    .max(new Date().getFullYear() + 1, "Year is too large"),
  vehicleType: vehicleTypeSchema,
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const createComponentSchema = z.object({
  name: z.string().trim().min(1, "Component name is required"),
  category: z.string().trim().min(1, "Category is required"),
  partNumber: z.string().trim().optional(),
});

export type CreateComponentInput = z.infer<typeof createComponentSchema>;

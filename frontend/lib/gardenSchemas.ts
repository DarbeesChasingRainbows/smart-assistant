import { z } from "zod";

export const createSpeciesSchema = z.object({
  name: z.string().min(1, "Name is required"),
  plantType: z.string().min(1, "Plant type is required"),
  daysToMaturity: z.coerce.number().int().positive().optional().or(z.nan().transform(() => undefined)),
});

export type CreateSpeciesInput = z.infer<typeof createSpeciesSchema>;

export const createGardenBedSchema = z.object({
  name: z.string().min(1, "Name is required"),
  area: z.coerce.number().finite().positive("Area must be greater than 0"),
  soilType: z.string().min(1, "Soil type is required"),
  hasIrrigation: z.coerce.boolean().default(false),
});

export type CreateGardenBedInput = z.infer<typeof createGardenBedSchema>;

export const createCropBatchSchema = z.object({
  batchName: z.string().min(1, "Batch name is required"),
  speciesId: z.string().min(1, "Species is required"),
  quantity: z.coerce.number().finite().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
});

export type CreateCropBatchInput = z.infer<typeof createCropBatchSchema>;

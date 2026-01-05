import { PageProps } from "$fresh/server.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreateCropBatchRequest,
  type SpeciesDto,
} from "../../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../../lib/forms.ts";
import { createCropBatchSchema } from "../../../lib/gardenSchemas.ts";
import FormField from "../../../components/forms/FormField.tsx";
import FormErrorSummary from "../../../components/forms/FormErrorSummary.tsx";

export default function AddBatchPage(props: PageProps) {
  const species = useSignal<SpeciesDto[]>([]);
  const loading = useSignal(true);
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  
  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  // Form fields
  const batchName = useSignal("");
  const speciesId = useSignal("");
  const quantity = useSignal(10);
  const unit = useSignal("seeds");

  useEffect(() => {
    loadSpecies();
  }, []);

  async function loadSpecies() {
    loading.value = true;
    try {
      const speciesData = await api.garden.species.getAll();
      species.value = speciesData;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load species";
    } finally {
      loading.value = false;
    }
  }

  function clearMessages() {
    error.value = null;
    success.value = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving.value = true;
    clearMessages();
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createCropBatchSchema.safeParse({
      batchName: batchName.value.trim(),
      speciesId: speciesId.value,
      quantity: quantity.value,
      unit: unit.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    try {
      const req: CreateCropBatchRequest = {
        batchName: parsed.data.batchName,
        speciesId: parsed.data.speciesId,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
      };
      
      await api.garden.batches.create(req);
      success.value = "Crop batch created successfully!";
      
      // Reset form
      batchName.value = "";
      speciesId.value = "";
      quantity.value = 10;
      fieldErrors.value = {};
      formErrors.value = [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create crop batch";
    } finally {
      saving.value = false;
    }
  }

  if (loading.value) {
    return (
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div class="max-w-2xl mx-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Add Crop Batch</h1>
          <p class="text-gray-600 mt-2">
            Create a new batch of crops for tracking
          </p>
        </div>
        <a
          href="/garden/crops"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back to Crops
        </a>
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}
      
      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success.value}
          <a href="/garden/crops" class="ml-4 underline">View all batches</a>
        </div>
      )}

      <form onSubmit={handleSubmit} class="bg-white rounded-xl shadow-md p-6 space-y-6">
        <FormErrorSummary errors={formErrors.value} />

        <FormField
          label="Batch Name"
          error={firstError(fieldErrors.value, "batchName")}
        >
          <input
            type="text"
            class={firstError(fieldErrors.value, "batchName")
              ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
            value={batchName.value}
            onInput={(e) =>
              batchName.value = (e.target as HTMLInputElement).value}
            placeholder="e.g. Spring Tomatoes"
            required
          />
        </FormField>

        <FormField
          label="Species"
          error={firstError(fieldErrors.value, "speciesId")}
        >
          <select
            class={firstError(fieldErrors.value, "speciesId")
              ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
            value={speciesId.value}
            onChange={(e) =>
              speciesId.value = (e.target as HTMLSelectElement).value}
            required
          >
            <option value="">Select species...</option>
            {species.value.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FormField>

        <div class="grid grid-cols-2 gap-3">
          <FormField
            label="Quantity"
            error={firstError(fieldErrors.value, "quantity")}
          >
            <input
              type="number"
              class={firstError(fieldErrors.value, "quantity")
                ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
              value={String(quantity.value)}
              onInput={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                quantity.value = raw ? Number.parseInt(raw, 10) : 0;
              }}
              required
            />
          </FormField>

          <FormField
            label="Unit"
            error={firstError(fieldErrors.value, "unit")}
          >
            <select
              class={firstError(fieldErrors.value, "unit")
                ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
              value={unit.value}
              onChange={(e) =>
                unit.value = (e.target as HTMLSelectElement).value}
            >
              <option>seeds</option>
              <option>plants</option>
              <option>lbs</option>
              <option>oz</option>
            </select>
          </FormField>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t">
          <a
            href="/garden/crops"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={saving.value}
          >
            {saving.value ? "Saving..." : "Create Batch"}
          </button>
        </div>
      </form>
    </div>
  );
}

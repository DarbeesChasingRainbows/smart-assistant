import { PageProps } from "$fresh/server.ts";
import { useSignal } from "@preact/signals";
import {
  api,
  type CreateGardenBedRequest,
} from "../../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../../lib/forms.ts";
import { createGardenBedSchema } from "../../../lib/gardenSchemas.ts";
import FormField from "../../../components/forms/FormField.tsx";
import FormErrorSummary from "../../../components/forms/FormErrorSummary.tsx";

export default function AddBedPage(props: PageProps) {
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  
  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  // Form fields
  const name = useSignal("");
  const area = useSignal(100);
  const soilType = useSignal("Loamy");
  const hasIrrigation = useSignal(false);

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

    const parsed = createGardenBedSchema.safeParse({
      name: name.value.trim(),
      area: area.value,
      soilType: soilType.value,
      hasIrrigation: hasIrrigation.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    try {
      const req: CreateGardenBedRequest = {
        name: parsed.data.name,
        area: parsed.data.area,
        soilType: parsed.data.soilType,
        hasIrrigation: parsed.data.hasIrrigation,
      };
      
      await api.garden.beds.create(req);
      success.value = "Garden bed created successfully!";
      
      // Reset form
      name.value = "";
      area.value = 100;
      soilType.value = "Loamy";
      hasIrrigation.value = false;
      fieldErrors.value = {};
      formErrors.value = [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create garden bed";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="max-w-2xl mx-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Add Garden Bed</h1>
          <p class="text-gray-600 mt-2">
            Create a new garden bed for planting
          </p>
        </div>
        <a
          href="/garden/beds"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back to Beds
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
          <a href="/garden/beds" class="ml-4 underline">View all beds</a>
        </div>
      )}

      <form onSubmit={handleSubmit} class="bg-white rounded-xl shadow-md p-6 space-y-6">
        <FormErrorSummary errors={formErrors.value} />

        <FormField label="Name" error={firstError(fieldErrors.value, "name")}>
          <input
            type="text"
            class={firstError(fieldErrors.value, "name")
              ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
            value={name.value}
            onInput={(e) => name.value = (e.target as HTMLInputElement).value}
            placeholder="e.g. North Bed"
            required
          />
        </FormField>

        <FormField
          label="Area (sq ft)"
          error={firstError(fieldErrors.value, "area")}
        >
          <input
            type="number"
            class={firstError(fieldErrors.value, "area")
              ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
            value={String(area.value)}
            onInput={(e) => {
              const raw = (e.target as HTMLInputElement).value;
              area.value = raw ? Number.parseInt(raw, 10) : 0;
            }}
            required
          />
        </FormField>

        <FormField
          label="Soil Type"
          error={firstError(fieldErrors.value, "soilType")}
        >
          <select
            class={firstError(fieldErrors.value, "soilType")
              ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
            value={soilType.value}
            onChange={(e) =>
              soilType.value = (e.target as HTMLSelectElement).value}
          >
            <option>Sandy</option>
            <option>Clay</option>
            <option>Loamy</option>
            <option>Silt</option>
            <option>Peaty</option>
            <option>Chalky</option>
          </select>
        </FormField>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="irrigation"
            checked={hasIrrigation.value}
            onChange={(e) =>
              hasIrrigation.value = (e.target as HTMLInputElement).checked}
          />
          <label for="irrigation" class="text-sm text-gray-700">
            Has Irrigation
          </label>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t">
          <a
            href="/garden/beds"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={saving.value}
          >
            {saving.value ? "Saving..." : "Create Bed"}
          </button>
        </div>
      </form>
    </div>
  );
}

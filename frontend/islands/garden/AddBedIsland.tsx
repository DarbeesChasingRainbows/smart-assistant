import { useSignal } from "@preact/signals";
import {
  api,
  type CreateGardenBedRequest,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import { createGardenBedSchema } from "../../lib/gardenSchemas.ts";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function AddBedIsland() {
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

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
    <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/garden/beds" class="text-slate-500 hover:text-slate-700">← Beds</a>
            <span class="text-2xl">🌿</span>
            <div>
              <h1 class="text-2xl font-bold text-slate-900">New Garden Bed</h1>
              <p class="text-sm text-slate-500">Define a new planting area</p>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-7 space-y-6">
        {error.value && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error.value}
          </div>
        )}

        {success.value && (
          <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
            {success.value}
            <a href="/garden/beds" class="ml-4 underline">View all beds</a>
          </div>
        )}

        <form onSubmit={handleSubmit} class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <FormErrorSummary errors={formErrors.value} />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name *" error={firstError(fieldErrors.value, "name")}>
              <input
                type="text"
                class={firstError(fieldErrors.value, "name")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={name.value}
                onInput={(e) => name.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. North Bed"
                required
              />
            </FormField>

            <FormField label="Area (sq ft)" error={firstError(fieldErrors.value, "area")}>
              <input
                type="number"
                class={firstError(fieldErrors.value, "area")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={String(area.value)}
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  area.value = raw ? Number.parseInt(raw, 10) : 0;
                }}
                required
              />
            </FormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Soil Type" error={firstError(fieldErrors.value, "soilType")}>
              <select
                class={firstError(fieldErrors.value, "soilType")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={soilType.value}
                onChange={(e) => soilType.value = (e.target as HTMLSelectElement).value}
              >
                <option>Sandy</option>
                <option>Clay</option>
                <option>Loamy</option>
                <option>Silt</option>
                <option>Peaty</option>
                <option>Chalky</option>
              </select>
            </FormField>

            <FormField label="Irrigation" error={null}>
              <label class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIrrigation.value}
                  onChange={(e) => hasIrrigation.value = (e.target as HTMLInputElement).checked}
                />
                <span class="text-sm text-slate-700">Has irrigation system</span>
              </label>
            </FormField>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <a
              href="/garden/beds"
              class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              disabled={saving.value}
            >
              {saving.value ? "Saving..." : "Create Bed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

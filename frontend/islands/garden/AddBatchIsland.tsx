import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreateCropBatchRequest,
  type SpeciesDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import { createCropBatchSchema } from "../../lib/gardenSchemas.ts";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function AddBatchIsland() {
  const species = useSignal<SpeciesDto[]>([]);
  const loading = useSignal(true);
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

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
      <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100 flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/garden/crops" class="text-slate-500 hover:text-slate-700">← Batches</a>
            <span class="text-2xl">🌾</span>
            <div>
              <h1 class="text-2xl font-bold text-slate-900">New Crop Batch</h1>
              <p class="text-sm text-slate-500">Track a new planting batch</p>
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
            <a href="/garden/crops" class="ml-4 underline">View all batches</a>
          </div>
        )}

        <form onSubmit={handleSubmit} class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <FormErrorSummary errors={formErrors.value} />

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Batch Name *" error={firstError(fieldErrors.value, "batchName")}>
              <input
                type="text"
                class={firstError(fieldErrors.value, "batchName")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={batchName.value}
                onInput={(e) => batchName.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. Spring Tomatoes"
                required
              />
            </FormField>

            <FormField label="Species *" error={firstError(fieldErrors.value, "speciesId")}>
              <select
                class={firstError(fieldErrors.value, "speciesId")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={speciesId.value}
                onChange={(e) => speciesId.value = (e.target as HTMLSelectElement).value}
                required
              >
                <option value="">Select species...</option>
                {species.value.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Quantity *" error={firstError(fieldErrors.value, "quantity")}>
              <input
                type="number"
                class={firstError(fieldErrors.value, "quantity")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={String(quantity.value)}
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value;
                  quantity.value = raw ? Number.parseInt(raw, 10) : 0;
                }}
                required
              />
            </FormField>

            <FormField label="Unit" error={firstError(fieldErrors.value, "unit")}>
              <select
                class={firstError(fieldErrors.value, "unit")
                  ? "w-full px-3 py-2 border border-red-400 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  : "w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"}
                value={unit.value}
                onChange={(e) => unit.value = (e.target as HTMLSelectElement).value}
              >
                <option>seeds</option>
                <option>plants</option>
                <option>lbs</option>
                <option>oz</option>
              </select>
            </FormField>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <a
              href="/garden/crops"
              class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              disabled={saving.value}
            >
              {saving.value ? "Saving..." : "Create Batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

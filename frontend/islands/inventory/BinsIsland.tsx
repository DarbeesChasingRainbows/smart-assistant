import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateInventoryBinRequest,
  type InventoryBinDto,
  type InventoryLocationDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const createBinSchema = z.object({
  locationKey: z.string().min(1, "Location is required"),
  name: z.string().min(1, "Bin name is required"),
});

type CreateBinInput = z.infer<typeof createBinSchema>;

export default function BinsIsland() {
  const bins = useSignal<InventoryBinDto[]>([]);
  const locations = useSignal<InventoryLocationDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const filterLocationKey = useSignal("");

  const showCreate = useSignal(false);
  const saving = useSignal(false);

  const locationKey = useSignal("");
  const name = useSignal("");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  const filteredBins = useComputed(() => {
    if (!filterLocationKey.value) return bins.value;
    return bins.value.filter((b) => b.locationKey === filterLocationKey.value);
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;

    try {
      const [locs, allBins] = await Promise.all([
        api.inventory.locations.list(),
        api.inventory.bins.list(),
      ]);
      locations.value = locs;
      bins.value = allBins;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load bins";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    locationKey.value = "";
    name.value = "";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createBinSchema.safeParse({
      locationKey: locationKey.value,
      name: name.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateInventoryBinRequest = {
      locationKey: parsed.data.locationKey,
      name: parsed.data.name,
    };

    try {
      const created = await api.inventory.bins.create(req);
      bins.value = [created, ...bins.value].sort((a, b) =>
        a.key.localeCompare(b.key)
      );
      showCreate.value = false;
      resetForm();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create bin";
    } finally {
      saving.value = false;
    }
  }

  function locationName(key: string) {
    return locations.value.find((l) => l.key === key)?.name ?? key;
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div class="flex gap-2 items-center">
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterLocationKey.value}
            onChange={(e) =>
              filterLocationKey.value = (e.target as HTMLSelectElement).value}
          >
            <option value="">All locations</option>
            {locations.value.map((l) => (
              <option key={l.key} value={l.key}>{l.name}</option>
            ))}
          </select>

          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={load}
            disabled={loading.value}
          >
            {loading.value ? "Loading..." : "Refresh"}
          </button>
        </div>

        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            showCreate.value = true;
            resetForm();
          }}
        >
          + Add Bin
        </button>
      </div>

      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && filteredBins.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No bins found</p>
          <p class="mt-2">Create bins to organize storage within a location</p>
        </div>
      )}

      {!loading.value && filteredBins.value.length > 0 && (
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="divide-y">
            {filteredBins.value.map((b) => (
              <div
                key={b.key}
                class="px-4 py-3 flex items-start justify-between gap-4"
              >
                <div>
                  <div class="font-medium text-gray-900">{b.name}</div>
                  <div class="text-sm text-gray-500">
                    Location: {locationName(b.locationKey)} • Key:{" "}
                    <span class="font-mono">{b.key}</span>
                  </div>
                </div>
                <span
                  class={b.isActive
                    ? "text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                    : "text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="New bin"
          subtitle="Add a bin under a location"
          onClose={() => {
            if (saving.value) return;
            showCreate.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showCreate.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitCreate}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={formErrors.value} />

          <FormField
            label="Location"
            error={firstError(fieldErrors.value, "locationKey")}
          >
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={locationKey.value}
              onChange={(e) =>
                locationKey.value = (e.target as HTMLSelectElement).value}
            >
              <option value="">Select location</option>
              {locations.value.map((l) => (
                <option key={l.key} value={l.key}>{l.name}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Bin name"
            error={firstError(fieldErrors.value, "name")}
          >
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={name.value}
              onInput={(e) =>
                name.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. Shelf A"
            />
          </FormField>
        </FormModal>
      )}
    </div>
  );
}

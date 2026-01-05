import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateInventoryLocationRequest,
  type InventoryLocationDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
});

export default function LocationsIsland() {
  const locations = useSignal<InventoryLocationDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const showCreate = useSignal(false);
  const saving = useSignal(false);

  const name = useSignal("");
  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      locations.value = await api.inventory.locations.list();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load locations";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    name.value = "";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createLocationSchema.safeParse({ name: name.value });
    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateInventoryLocationRequest = { name: parsed.data.name };

    try {
      const created = await api.inventory.locations.create(req);
      locations.value = [created, ...locations.value].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      showCreate.value = false;
      resetForm();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create location";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            showCreate.value = true;
            resetForm();
          }}
        >
          + Add Location
        </button>
        <button
          type="button"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={load}
          disabled={loading.value}
        >
          {loading.value ? "Loading..." : "Refresh"}
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

      {!loading.value && locations.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No locations yet</p>
          <p class="mt-2">Create a location like “Main” or “Shop”</p>
        </div>
      )}

      {!loading.value && locations.value.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.value.map((l) => (
            <div key={l.key} class="bg-white border rounded-xl p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold text-gray-900">
                    {l.name}
                  </div>
                  <div class="text-sm text-gray-500">
                    Key: <span class="font-mono">{l.key}</span>
                  </div>
                </div>
                <span
                  class={l.isActive
                    ? "text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                    : "text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"}
                >
                  {l.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="New location"
          subtitle="Create a storage location"
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
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={submitCreate}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={formErrors.value} />

          <FormField label="Name" error={firstError(fieldErrors.value, "name")}>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={name.value}
              onInput={(e) =>
                name.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. Main"
            />
          </FormField>
        </FormModal>
      )}
    </div>
  );
}

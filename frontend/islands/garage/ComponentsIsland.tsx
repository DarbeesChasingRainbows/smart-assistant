import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type ComponentDto,
  type CreateComponentRequest,
  type VehicleDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import {
  createComponentSchema,
  type CreateComponentInput,
} from "../../lib/garageSchemas.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function ComponentsIsland() {
  const vehicles = useSignal<VehicleDto[]>([]);
  const selectedVehicleId = useSignal<string>("");

  const components = useSignal<ComponentDto[]>([]);
  const loadingVehicles = useSignal(true);
  const loadingComponents = useSignal(false);

  const error = useSignal<string | null>(null);

  const search = useSignal("");

  const showCreate = useSignal(false);
  const saving = useSignal(false);

  const name = useSignal("");
  const category = useSignal("Other");
  const partNumber = useSignal("");
  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  const selectedVehicle = useComputed(() => {
    return vehicles.value.find((v) => v.id === selectedVehicleId.value) ?? null;
  });

  const filteredComponents = useComputed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return components.value;

    return components.value.filter((c) => {
      const pn = c.partNumber?.toLowerCase() ?? "";
      const locationType = c.location?.type?.toLowerCase() ?? "";
      return (
        c.name.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term) ||
        pn.includes(term) ||
        locationType.includes(term)
      );
    });
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    loadingVehicles.value = true;
    error.value = null;

    try {
      const list = await api.vehicles.getAll();
      vehicles.value = list;
      if (!selectedVehicleId.value && list.length > 0) {
        selectedVehicleId.value = list[0].id;
        await loadComponents(list[0].id);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load vehicles";
    } finally {
      loadingVehicles.value = false;
    }
  }

  async function loadComponents(vehicleId: string) {
    loadingComponents.value = true;
    error.value = null;
    try {
      components.value = await api.components.getByVehicle(vehicleId);
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load components";
    } finally {
      loadingComponents.value = false;
    }
  }

  function resetForm() {
    name.value = "";
    category.value = "Other";
    partNumber.value = "";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreateAndInstall() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const vehicleId = selectedVehicleId.value;
    if (!vehicleId) {
      error.value = "Select a vehicle first";
      saving.value = false;
      return;
    }

    const parsed = createComponentSchema.safeParse(
      {
        name: name.value,
        category: category.value,
        partNumber: partNumber.value.trim() || undefined,
      } satisfies CreateComponentInput,
    );

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateComponentRequest = {
      name: parsed.data.name.trim(),
      category: parsed.data.category.trim(),
      partNumber: parsed.data.partNumber?.trim() || null,
    };

    try {
      const created = await api.components.create(req);
      await api.components.install(created.id, { vehicleId });
      await loadComponents(vehicleId);
      showCreate.value = false;
      resetForm();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create/install component";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={selectedVehicleId.value}
            onChange={async (e) => {
              const id = (e.target as HTMLSelectElement).value;
              selectedVehicleId.value = id;
              await loadComponents(id);
            }}
            disabled={loadingVehicles.value}
          >
            {vehicles.value.length === 0 && (
              <option value="">No vehicles</option>
            )}
            {vehicles.value.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
          </select>

          <input
            type="text"
            class="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={search.value}
            onInput={(e) => search.value = (e.target as HTMLInputElement).value}
            placeholder="Search components..."
          />

          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => {
              if (selectedVehicleId.value) {loadComponents(
                  selectedVehicleId.value,
                );}
            }}
            disabled={loadingComponents.value || !selectedVehicleId.value}
          >
            {loadingComponents.value ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div class="flex gap-2">
          {selectedVehicleId.value && (
            <a
              href={`/garage/vehicles/${selectedVehicleId.value}`}
              class="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View vehicle →
            </a>
          )}
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              showCreate.value = true;
              resetForm();
            }}
            disabled={!selectedVehicleId.value}
          >
            + Add + Install
          </button>
        </div>
      </div>

      {selectedVehicle.value && (
        <div class="text-sm text-gray-600">
          Showing components for:
          <span class="font-medium text-gray-900">
            {" "}
            {selectedVehicle.value.year} {selectedVehicle.value.make}{" "}
            {selectedVehicle.value.model}
          </span>
        </div>
      )}

      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {(loadingVehicles.value || loadingComponents.value) && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loadingVehicles.value && selectedVehicleId.value &&
        !loadingComponents.value && filteredComponents.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No installed components</p>
          <p class="mt-2">
            Use “Add + Install” to attach parts to this vehicle
          </p>
        </div>
      )}

      {!loadingComponents.value && filteredComponents.value.length > 0 && (
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b text-xs font-semibold text-gray-500">
            <div class="col-span-5">Component</div>
            <div class="col-span-3">Category</div>
            <div class="col-span-4">Location</div>
          </div>
          <div class="divide-y">
            {filteredComponents.value.map((c) => (
              <div key={c.id} class="grid grid-cols-12 gap-2 px-4 py-3">
                <div class="col-span-5">
                  <div class="font-medium text-gray-900">{c.name}</div>
                  {c.partNumber && (
                    <div class="text-xs text-gray-400 font-mono">
                      {c.partNumber}
                    </div>
                  )}
                </div>
                <div class="col-span-3 text-gray-900">{c.category}</div>
                <div class="col-span-4 text-gray-700">
                  {c.location?.type ?? "Unknown"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="Add + Install Component"
          subtitle="Creates a component and installs it onto the selected vehicle"
          onClose={() => {
            if (saving.value) return;
            showCreate.value = false;
            resetForm();
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
                  resetForm();
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitCreateAndInstall}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create + Install"}
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
              placeholder="e.g. Alternator"
            />
          </FormField>

          <FormField
            label="Category"
            error={firstError(fieldErrors.value, "category")}
          >
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={category.value}
              onInput={(e) =>
                category.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. Electrical"
            />
          </FormField>

          <FormField label="Part number" error={null} hint="Optional">
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={partNumber.value}
              onInput={(e) =>
                partNumber.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. 123-ABC"
            />
          </FormField>
        </FormModal>
      )}
    </div>
  );
}

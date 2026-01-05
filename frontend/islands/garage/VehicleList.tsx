import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  getVehicleTypeDetails,
  getVehicleTypeIcon,
  type CreateVehicleRequest,
  type VehicleDto,
  type VehicleTypeDto,
} from "../../lib/api.ts";
import { zodToFieldErrors } from "../../lib/forms.ts";
import {
  createVehicleSchema,
  type CreateVehicleInput,
} from "../../lib/garageSchemas.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

interface VehicleListProps {
  initialVehicles?: VehicleDto[];
  initialShowCreate?: boolean;
}

export default function VehicleList(
  { initialVehicles = [], initialShowCreate }: VehicleListProps,
) {
  const vehicles = useSignal<VehicleDto[]>(initialVehicles);
  const loading = useSignal(initialVehicles.length === 0);
  const error = useSignal<string | null>(null);
  const searchTerm = useSignal("");
  const filterActive = useSignal<boolean | null>(null);

  const showCreate = useSignal(Boolean(initialShowCreate));
  const saving = useSignal(false);

  const vin = useSignal("");
  const licensePlate = useSignal("");
  const make = useSignal("");
  const model = useSignal("");
  const year = useSignal(String(new Date().getFullYear()));
  const vehicleType = useSignal<VehicleTypeDto["type"]>("Car");

  const payloadCapacity = useSignal("");
  const rvLength = useSignal("");
  const slideOuts = useSignal("");
  const bodyStyle = useSignal("");
  const engineCC = useSignal("");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  const filteredVehicles = useComputed(() => {
    let result = vehicles.value;

    if (filterActive.value !== null) {
      result = result.filter((v) => v.isActive === filterActive.value);
    }

    if (searchTerm.value) {
      const term = searchTerm.value.toLowerCase();
      result = result.filter((v) =>
        v.make.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term) ||
        v.vin.toLowerCase().includes(term) ||
        (v.licensePlate?.toLowerCase().includes(term) ?? false)
      );
    }

    return result;
  });

  useEffect(() => {
    if (initialVehicles.length === 0) {
      loadVehicles();
    }
  }, []);

  function resetCreateForm() {
    vin.value = "";
    licensePlate.value = "";
    make.value = "";
    model.value = "";
    year.value = String(new Date().getFullYear());
    vehicleType.value = "Car";

    payloadCapacity.value = "";
    rvLength.value = "";
    slideOuts.value = "";
    bodyStyle.value = "";
    engineCC.value = "";

    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const vehicleTypeInput: CreateVehicleInput["vehicleType"] =
      vehicleType.value === "Truck"
        ? {
          type: "Truck",
          payloadCapacity: payloadCapacity.value.trim()
            ? Number(payloadCapacity.value)
            : undefined,
        }
        : vehicleType.value === "RV"
        ? {
          type: "RV",
          length: rvLength.value.trim() ? Number(rvLength.value) : undefined,
          slideOuts: slideOuts.value.trim() ? Number(slideOuts.value) : undefined,
        }
        : vehicleType.value === "Motorcycle"
        ? {
          type: "Motorcycle",
          engineCC: engineCC.value.trim() ? Number(engineCC.value) : undefined,
        }
        : {
          type: "Car",
          bodyStyle: bodyStyle.value.trim() || undefined,
        };

    const parsed = createVehicleSchema.safeParse(
      {
        vin: vin.value,
        licensePlate: licensePlate.value.trim() || undefined,
        make: make.value,
        model: model.value,
        year: Number(year.value),
        vehicleType: vehicleTypeInput,
      } satisfies CreateVehicleInput,
    );

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateVehicleRequest = {
      vin: parsed.data.vin,
      licensePlate: parsed.data.licensePlate?.trim() || undefined,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      vehicleType: parsed.data.vehicleType as VehicleTypeDto,
    };

    try {
      await api.vehicles.create(req);
      await loadVehicles();
      showCreate.value = false;
      resetCreateForm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create vehicle";
      error.value = msg;
      formErrors.value = [msg];
    } finally {
      saving.value = false;
    }
  }

  async function loadVehicles() {
    loading.value = true;
    error.value = null;
    try {
      console.log("Loading vehicles...");
      const data = await api.vehicles.getAll();
      console.log("Loaded vehicles:", data);
      vehicles.value = data;
    } catch (e) {
      console.error("Failed to load vehicles:", e);
      error.value = e instanceof Error ? e.message : "Failed to load vehicles";
    } finally {
      loading.value = false;
    }
  }

  async function toggleActive(vehicle: VehicleDto) {
    try {
      const updated = await api.vehicles.update(vehicle.id, {
        isActive: !vehicle.isActive,
      });
      vehicles.value = vehicles.value.map((v) =>
        v.id === updated.id ? updated : v
      );
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update vehicle";
    }
  }

  async function deleteVehicle(id: string) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      await api.vehicles.delete(id);
      vehicles.value = vehicles.value.filter((v) => v.id !== id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete vehicle";
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-end">
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            showCreate.value = true;
          }}
        >
          + Add Vehicle
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            type="text"
            placeholder="Search vehicles..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm.value}
            onInput={(e) =>
              searchTerm.value = (e.target as HTMLInputElement).value}
          />
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class={`px-4 py-2 rounded-lg transition-colors ${
              filterActive.value === null
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => filterActive.value = null}
          >
            All
          </button>
          <button
            type="button"
            class={`px-4 py-2 rounded-lg transition-colors ${
              filterActive.value === true
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => filterActive.value = true}
          >
            Active
          </button>
          <button
            type="button"
            class={`px-4 py-2 rounded-lg transition-colors ${
              filterActive.value === false
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => filterActive.value = false}
          >
            Inactive
          </button>
        </div>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={loadVehicles}
          disabled={loading.value}
        >
          {loading.value ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {/* Loading State */}
      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600">
          </div>
        </div>
      )}

      {/* Vehicle Grid */}
      {!loading.value && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.value.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onToggleActive={() => toggleActive(vehicle)}
              onDelete={() => deleteVehicle(vehicle.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading.value && filteredVehicles.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No vehicles found</p>
          <p class="mt-2">Add a vehicle to get started</p>
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="Add Vehicle"
          subtitle="Minimal details first. You can fill in the rest later."
          onClose={() => {
            if (saving.value) return;
            showCreate.value = false;
            resetCreateForm();
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
                  resetCreateForm();
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

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="VIN"
              error={fieldErrors.value.vin?.[0] ?? null}
              hint="17 characters"
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={vin.value}
                onInput={(e) =>
                  vin.value = (e.target as HTMLInputElement).value}
                maxLength={17}
              />
            </FormField>

            <FormField
              label="License Plate"
              error={fieldErrors.value.licensePlate?.[0] ?? null}
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={licensePlate.value}
                onInput={(e) =>
                  licensePlate.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Make"
              error={fieldErrors.value.make?.[0] ?? null}
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={make.value}
                onInput={(e) =>
                  make.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="Model"
              error={fieldErrors.value.model?.[0] ?? null}
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={model.value}
                onInput={(e) =>
                  model.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Year"
              error={fieldErrors.value.year?.[0] ?? null}
            >
              <input
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={year.value}
                onInput={(e) =>
                  year.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="Type"
              error={fieldErrors.value.vehicleType?.[0] ?? null}
            >
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={vehicleType.value}
                onChange={(e) =>
                  vehicleType.value = (e.target as HTMLSelectElement)
                    .value as VehicleTypeDto["type"]}
              >
                <option value="Car">Car</option>
                <option value="Truck">Truck</option>
                <option value="RV">RV</option>
                <option value="Motorcycle">Motorcycle</option>
              </select>
            </FormField>
          </div>

          {vehicleType.value === "Truck" && (
            <FormField
              label="Payload Capacity"
              error={fieldErrors.value["vehicleType.payloadCapacity"]?.[0] ?? null}
              hint="Optional"
            >
              <input
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={payloadCapacity.value}
                onInput={(e) =>
                  payloadCapacity.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          )}

          {vehicleType.value === "RV" && (
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Length"
                error={fieldErrors.value["vehicleType.length"]?.[0] ?? null}
                hint="Optional"
              >
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={rvLength.value}
                  onInput={(e) =>
                    rvLength.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
              <FormField
                label="Slide Outs"
                error={fieldErrors.value["vehicleType.slideOuts"]?.[0] ?? null}
                hint="Optional"
              >
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={slideOuts.value}
                  onInput={(e) =>
                    slideOuts.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
            </div>
          )}

          {vehicleType.value === "Car" && (
            <FormField
              label="Body Style"
              error={fieldErrors.value["vehicleType.bodyStyle"]?.[0] ?? null}
              hint="Optional"
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={bodyStyle.value}
                onInput={(e) =>
                  bodyStyle.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          )}

          {vehicleType.value === "Motorcycle" && (
            <FormField
              label="Engine CC"
              error={fieldErrors.value["vehicleType.engineCC"]?.[0] ?? null}
              hint="Optional"
            >
              <input
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={engineCC.value}
                onInput={(e) =>
                  engineCC.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          )}
        </FormModal>
      )}
    </div>
  );
}

interface VehicleCardProps {
  vehicle: VehicleDto;
  onToggleActive: () => void;
  onDelete: () => void;
}

function VehicleCard({ vehicle, onToggleActive, onDelete }: VehicleCardProps) {
  return (
    <div
      class={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
        vehicle.isActive ? "border-green-500" : "border-gray-400"
      }`}
    >
      <div class="p-4">
        {/* Header */}
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">
              {getVehicleTypeIcon(vehicle.vehicleType.type)}
            </span>
            <div>
              <h3 class="font-bold text-lg">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p class="text-sm text-gray-500">
                {getVehicleTypeDetails(vehicle.vehicleType)}
              </p>
            </div>
          </div>
          <span
            class={`px-2 py-1 rounded-full text-xs font-medium ${
              vehicle.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {vehicle.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Details */}
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">VIN</span>
            <span class="font-mono text-xs">{vehicle.vin}</span>
          </div>
          {vehicle.licensePlate && (
            <div class="flex justify-between">
              <span class="text-gray-500">License Plate</span>
              <span class="font-semibold">{vehicle.licensePlate}</span>
            </div>
          )}
          <div class="flex justify-between">
            <span class="text-gray-500">Mileage</span>
            <span>{vehicle.currentMileage.toLocaleString()} mi</span>
          </div>
        </div>

        {/* Actions */}
        <div class="flex gap-2 mt-4 pt-4 border-t">
          <a
            href={`/garage/vehicles/${vehicle.id}`}
            class="flex-1 text-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            View
          </a>
          <button
            type="button"
            onClick={onToggleActive}
            class={`flex-1 px-3 py-2 rounded-lg transition-colors ${
              vehicle.isActive
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {vehicle.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            class="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

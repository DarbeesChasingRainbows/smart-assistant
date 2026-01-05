import { useSignal } from "@preact/signals";
import {
  api,
  type CreateVehicleRequest,
  type VehicleTypeDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import { createVehicleSchema } from "../../lib/garageSchemas.ts";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

interface VehicleFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function VehicleForm(
  { onSuccess, onCancel }: VehicleFormProps,
) {
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  // Form fields
  const vin = useSignal("");
  const licensePlate = useSignal("");
  const make = useSignal("");
  const model = useSignal("");
  const year = useSignal(String(new Date().getFullYear()));
  const vehicleType = useSignal<"Truck" | "RV" | "Car" | "Motorcycle">("Car");

  // Type-specific fields
  const payloadCapacity = useSignal("0");
  const rvLength = useSignal("0");
  const slideOuts = useSignal("0");
  const bodyStyle = useSignal("Sedan");
  const engineCC = useSignal("0");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createVehicleSchema.safeParse({
      vin: vin.value,
      licensePlate: licensePlate.value || undefined,
      make: make.value,
      model: model.value,
      year: year.value,
      vehicleType: vehicleType.value,
      payloadCapacity: vehicleType.value === "Truck"
        ? payloadCapacity.value
        : undefined,
      length: vehicleType.value === "RV" ? rvLength.value : undefined,
      slideOuts: vehicleType.value === "RV" ? slideOuts.value : undefined,
      bodyStyle: vehicleType.value === "Car" ? bodyStyle.value : undefined,
      engineCC: vehicleType.value === "Motorcycle" ? engineCC.value : undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      loading.value = false;
      return;
    }

    try {
      const vehicleTypeDto: VehicleTypeDto = buildVehicleType(parsed.data);

      const request: CreateVehicleRequest = {
        vin: parsed.data.vin,
        licensePlate: parsed.data.licensePlate,
        make: parsed.data.make,
        model: parsed.data.model,
        year: parsed.data.year,
        vehicleType: vehicleTypeDto,
      };

      await api.vehicles.create(request);
      onSuccess?.();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create vehicle";
    } finally {
      loading.value = false;
    }
  }

  // deno-lint-ignore no-explicit-any
  function buildVehicleType(data: any): VehicleTypeDto {
    switch (data.vehicleType) {
      case "Truck":
        return { type: "Truck", payloadCapacity: data.payloadCapacity };
      case "RV":
        return {
          type: "RV",
          length: data.length,
          slideOuts: data.slideOuts,
        };
      case "Car":
        return { type: "Car", bodyStyle: data.bodyStyle };
      case "Motorcycle":
        return { type: "Motorcycle", engineCC: data.engineCC };
      default:
        throw new Error("Invalid vehicle type");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      class="space-y-6 bg-white p-6 rounded-xl shadow-lg"
    >
      <h2 class="text-2xl font-bold text-gray-800">Add New Vehicle</h2>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      <FormErrorSummary errors={formErrors.value} />

      {/* Basic Info */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="VIN" error={firstError(fieldErrors.value, "vin")}>
          <input
            type="text"
            maxLength={17}
            minLength={17}
            placeholder="17-character VIN"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={vin.value}
            onInput={(e) =>
              vin.value = (e.target as HTMLInputElement).value.toUpperCase()}
          />
          <p class="text-xs text-gray-500 mt-1">
            {vin.value.length}/17 characters
          </p>
        </FormField>

        <FormField
          label="License Plate"
          error={firstError(fieldErrors.value, "licensePlate")}
          hint="Optional"
        >
          <input
            type="text"
            placeholder="ABC-1234"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={licensePlate.value}
            onInput={(e) =>
              licensePlate.value = (e.target as HTMLInputElement).value
                .toUpperCase()}
          />
        </FormField>

        <FormField label="Make" error={firstError(fieldErrors.value, "make")}>
          <input
            type="text"
            placeholder="e.g., Ford, Toyota"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={make.value}
            onInput={(e) => make.value = (e.target as HTMLInputElement).value}
          />
        </FormField>

        <FormField label="Model" error={firstError(fieldErrors.value, "model")}>
          <input
            type="text"
            placeholder="e.g., F-150, Camry"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={model.value}
            onInput={(e) => model.value = (e.target as HTMLInputElement).value}
          />
        </FormField>

        <FormField label="Year" error={firstError(fieldErrors.value, "year")}>
          <input
            type="number"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
            value={year.value}
            onInput={(e) =>
              year.value = (e.target as HTMLInputElement).value}
          />
        </FormField>

        <FormField
          label="Vehicle Type"
          error={firstError(fieldErrors.value, "vehicleType")}
        >
          <select
            class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            value={vehicleType.value}
            onChange={(e) =>
              vehicleType.value = (e.target as HTMLSelectElement)
                .value as typeof vehicleType.value}
          >
            <option value="Car">🚗 Car</option>
            <option value="Truck">🚛 Truck</option>
            <option value="RV">🚐 RV</option>
            <option value="Motorcycle">🏍️ Motorcycle</option>
          </select>
        </FormField>
      </div>

      {/* Type-specific fields */}
      <div class="border-t pt-4">
        <h3 class="text-lg font-medium text-gray-800 mb-3">
          {vehicleType.value} Details
        </h3>

        {vehicleType.value === "Truck" && (
          <FormField
            label="Payload Capacity (lbs)"
            error={firstError(fieldErrors.value, "payloadCapacity")}
          >
            <input
              type="number"
              min={0}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={payloadCapacity.value}
              onInput={(e) =>
                payloadCapacity.value = (e.target as HTMLInputElement).value}
            />
          </FormField>
        )}

        {vehicleType.value === "RV" && (
          <div class="grid grid-cols-2 gap-4">
            <FormField
              label="Length (ft)"
              error={firstError(fieldErrors.value, "length")}
            >
              <input
                type="number"
                min={0}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={rvLength.value}
                onInput={(e) =>
                  rvLength.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
            <FormField
              label="Slide-outs"
              error={firstError(fieldErrors.value, "slideOuts")}
            >
              <input
                type="number"
                min={0}
                max={10}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
            error={firstError(fieldErrors.value, "bodyStyle")}
          >
            <select
              class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              value={bodyStyle.value}
              onChange={(e) =>
                bodyStyle.value = (e.target as HTMLSelectElement).value}
            >
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Coupe">Coupe</option>
              <option value="Hatchback">Hatchback</option>
              <option value="Wagon">Wagon</option>
              <option value="Convertible">Convertible</option>
            </select>
          </FormField>
        )}

        {vehicleType.value === "Motorcycle" && (
          <FormField
            label="Engine Size (cc)"
            error={firstError(fieldErrors.value, "engineCC")}
          >
            <input
              type="number"
              min={0}
              class="w-full px-4 py-2 border border-gray-300 rounded-lg"
              value={engineCC.value}
              onInput={(e) =>
                engineCC.value = (e.target as HTMLInputElement).value}
            />
          </FormField>
        )}
      </div>

      {/* Actions */}
      <div class="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={loading.value}
          class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading.value ? "Creating..." : "Create Vehicle"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

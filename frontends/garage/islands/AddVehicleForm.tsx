import { useSignal } from "@preact/signals";
import { IS_BROWSER } from "fresh/runtime";
import VinLookup, { type VinData } from "./VinLookup.tsx";
import { Spinner } from "../components/Spinner.tsx";
import { GarageApiClient } from "../utils/api.ts";
import { url } from "../utils.ts";
import type {
  CreateVehicleRequest,
  Vehicle,
  VehicleType,
} from "../utils/contracts.ts";

interface AddVehicleFormProps {
  initialVinData?: VinData;
  onVehicleAdded?: (vehicle: Vehicle) => void;
}

export default function AddVehicleForm(
  { initialVinData, onVehicleAdded }: AddVehicleFormProps,
) {
  // Check for VIN data in sessionStorage (client-side persistence)
  const storedVinData = IS_BROWSER
    ? globalThis.sessionStorage?.getItem("vinData")
    : null;

  let vinDataFromStorage: VinData | null = null;
  if (storedVinData) {
    try {
      vinDataFromStorage = JSON.parse(storedVinData) as VinData;
    } catch {
      if (IS_BROWSER) {
        globalThis.sessionStorage?.removeItem("vinData");
      }
      vinDataFromStorage = null;
    }
  }

  // Use stored data if no initial data provided
  const effectiveVinData = initialVinData || vinDataFromStorage;

  // Form state
  const vehicleType = useSignal<VehicleType>(
    effectiveVinData?.isRv ? "rv" : "car",
  );
  const vin = useSignal(effectiveVinData?.vin || "");
  const make = useSignal(effectiveVinData?.make || "");
  const model = useSignal(effectiveVinData?.model || "");
  const year = useSignal(effectiveVinData?.year?.toString() || "");
  const trim = useSignal(effectiveVinData?.trim || "");
  const engine = useSignal(effectiveVinData?.engine || "");
  const transmission = useSignal(effectiveVinData?.transmission || "");
  const licensePlate = useSignal("");
  const color = useSignal("");
  const purchaseDate = useSignal("");
  const purchaseMileage = useSignal("");
  const currentMileage = useSignal("");

  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  // Clear stored data when form is submitted
  const clearStoredData = () => {
    if (IS_BROWSER) {
      globalThis.sessionStorage?.removeItem("vinData");
    }
  };

  // API client
  const api = new GarageApiClient();

  const handleVinData = (data: VinData) => {
    // Auto-fill form with VIN data
    vin.value = data.vin;
    make.value = data.make;
    model.value = data.model;
    year.value = data.year.toString();
    trim.value = data.trim || "";
    engine.value = data.engine || "";
    transmission.value = data.transmission || "";
    vehicleType.value = data.isRv ? "rv" : "car";
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    submitting.value = true;
    error.value = null;
    clearStoredData(); // Clear stored VIN data
    success.value = null;

    if (!currentMileage.value) {
      error.value = "Current mileage is required";
      submitting.value = false;
      return;
    }

    try {
      const vehicleRequest: CreateVehicleRequest = {
        vehicleType: vehicleType.value,
        vin: vin.value || undefined,
        make: make.value,
        model: model.value,
        year: parseInt(year.value),
        trim: trim.value || undefined,
        engine: engine.value || undefined,
        transmission: transmission.value || undefined,
        licensePlate: licensePlate.value || undefined,
        color: color.value || undefined,
        purchaseDate: purchaseDate.value || undefined,
        purchaseMileage: purchaseMileage.value
          ? parseInt(purchaseMileage.value)
          : undefined,
        currentMileage: parseInt(currentMileage.value),
      };

      const newVehicle = await api.createVehicle(vehicleRequest);

      success.value = "Vehicle added successfully!";

      // Clear form
      vin.value = "";
      make.value = "";
      model.value = "";
      year.value = "";
      trim.value = "";
      engine.value = "";
      transmission.value = "";
      licensePlate.value = "";
      color.value = "";
      purchaseDate.value = "";
      purchaseMileage.value = "";
      currentMileage.value = "";

      // Notify parent component
      if (onVehicleAdded) {
        onVehicleAdded(newVehicle);
      }

      // Clear success message after 3 seconds
      setTimeout(() => success.value = null, 3000);
    } catch (err) {
      error.value = err instanceof Error
        ? err.message
        : "Failed to create vehicle. Please try again.";
      console.error("Submit error:", err);
    } finally {
      submitting.value = false;
    }
  };

  return (
    <div>
      {/* VIN Lookup Island */}
      <VinLookup onVinData={handleVinData} />

      {/* Error Message */}
      {error.value && (
        <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.value}
        </div>
      )}

      {/* Vehicle Form */}
      <form onSubmit={handleSubmit} class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Vehicle Information
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle Type */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type *
            </label>
            <select
              value={vehicleType.value}
              onChange={(e) =>
                vehicleType.value = (e.target as HTMLSelectElement).value as
                  | "car"
                  | "rv"}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              <option value="car">🚗 Car</option>
              <option value="rv">🏕️ RV/Motorhome</option>
            </select>
          </div>

          {/* VIN */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              VIN (17 digits)
            </label>
            <input
              type="text"
              value={vin.value}
              onInput={(e) =>
                vin.value = (e.target as HTMLInputElement).value.toUpperCase()}
              placeholder="Optional"
              maxLength={17}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
            />
          </div>

          {/* Make */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Make *
            </label>
            <input
              type="text"
              value={make.value}
              onInput={(e) => make.value = (e.target as HTMLInputElement).value}
              required
              placeholder="e.g., Toyota, Ford, Winnebago"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Model */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <input
              type="text"
              value={model.value}
              onInput={(e) =>
                model.value = (e.target as HTMLInputElement).value}
              required
              placeholder="e.g., Camry, F-150, Adventurer"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Year */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Year *
            </label>
            <input
              type="number"
              value={year.value}
              onInput={(e) => year.value = (e.target as HTMLInputElement).value}
              required
              min="1900"
              max={new Date().getFullYear() + 1}
              placeholder="e.g., 2023"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Trim */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Trim
            </label>
            <input
              type="text"
              value={trim.value}
              onInput={(e) => trim.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., XLE, Limited, 30C"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Engine */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Engine
            </label>
            <input
              type="text"
              value={engine.value}
              onInput={(e) =>
                engine.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., 2.5L V6, 6.7L V8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Transmission */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Transmission
            </label>
            <input
              type="text"
              value={transmission.value}
              onInput={(e) =>
                transmission.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., Automatic, Manual"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* License Plate */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              License Plate
            </label>
            <input
              type="text"
              value={licensePlate.value}
              onInput={(e) =>
                licensePlate.value = (e.target as HTMLInputElement).value}
              placeholder="Optional"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              type="text"
              value={color.value}
              onInput={(e) =>
                color.value = (e.target as HTMLInputElement).value}
              placeholder="Optional"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purchase Date */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate.value}
              onInput={(e) =>
                purchaseDate.value = (e.target as HTMLInputElement).value}
              max={new Date().toISOString().split("T")[0]}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Purchase Mileage */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Purchase Mileage
            </label>
            <input
              type="number"
              value={purchaseMileage.value}
              onInput={(e) =>
                purchaseMileage.value = (e.target as HTMLInputElement).value}
              min="0"
              placeholder="Optional"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Current Mileage */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Current Mileage *
            </label>
            <input
              type="number"
              value={currentMileage.value}
              onInput={(e) =>
                currentMileage.value = (e.target as HTMLInputElement).value}
              required
              min="0"
              placeholder="Current odometer reading"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div class="mt-8 flex gap-3">
          <a
            href={url("/vehicles")}
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting.value}
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            {submitting.value
              ? (
                <>
                  <Spinner size="sm" color="white" />
                  Adding Vehicle...
                </>
              )
              : (
                "Add Vehicle"
              )}
          </button>
        </div>
      </form>
    </div>
  );
}

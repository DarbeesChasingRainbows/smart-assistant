import { useSignal } from "@preact/signals";
import VinLookup, { type VinData } from "./VinLookup.tsx";
import { Spinner } from "../components/Spinner.tsx";

interface AddVehicleFormProps {
  initialVinData?: VinData;
}

export default function AddVehicleForm({ initialVinData }: AddVehicleFormProps) {
  // Form state
  const vehicleType = useSignal<"car" | "rv">(initialVinData?.isRv ? "rv" : "car");
  const vin = useSignal(initialVinData?.vin || "");
  const make = useSignal(initialVinData?.make || "");
  const model = useSignal(initialVinData?.model || "");
  const year = useSignal(initialVinData?.year?.toString() || "");
  const trim = useSignal(initialVinData?.trim || "");
  const engine = useSignal(initialVinData?.engine || "");
  const transmission = useSignal(initialVinData?.transmission || "");
  const licensePlate = useSignal("");
  const color = useSignal("");
  const purchaseDate = useSignal("");
  const purchaseMileage = useSignal("");
  const currentMileage = useSignal("");
  
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);

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

    const formData = new FormData();
    formData.append("vehicleType", vehicleType.value);
    formData.append("vin", vin.value);
    formData.append("make", make.value);
    formData.append("model", model.value);
    formData.append("year", year.value);
    formData.append("trim", trim.value);
    formData.append("engine", engine.value);
    formData.append("transmission", transmission.value);
    formData.append("licensePlate", licensePlate.value);
    formData.append("color", color.value);
    formData.append("purchaseDate", purchaseDate.value);
    formData.append("purchaseMileage", purchaseMileage.value);
    formData.append("currentMileage", currentMileage.value);

    try {
      const response = await fetch("/vehicles/add", {
        method: "POST",
        body: formData,
      });

      if (response.redirected) {
        globalThis.location.href = response.url;
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        // Try to extract error from HTML response
        const match = text.match(/class="[^"]*text-red[^"]*"[^>]*>([^<]+)</);
        error.value = match ? match[1] : "Failed to create vehicle";
      }
    } catch (err) {
      error.value = "Failed to create vehicle. Please try again.";
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
              onChange={(e) => vehicleType.value = (e.target as HTMLSelectElement).value as "car" | "rv"}
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
              onInput={(e) => vin.value = (e.target as HTMLInputElement).value.toUpperCase()}
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
              onInput={(e) => model.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => engine.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => transmission.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => licensePlate.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => color.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => purchaseDate.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => purchaseMileage.value = (e.target as HTMLInputElement).value}
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
              onInput={(e) => currentMileage.value = (e.target as HTMLInputElement).value}
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
            href="/vehicles"
            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting.value}
            class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            {submitting.value ? (
              <>
                <Spinner size="sm" color="white" />
                Adding Vehicle...
              </>
            ) : (
              "Add Vehicle"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

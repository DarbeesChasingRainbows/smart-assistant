import { useSignal } from "@preact/signals";
import { Spinner } from "../components/Spinner.tsx";
import { ConfirmModal } from "../components/Modal.tsx";

interface Vehicle {
  id: string;
  vin?: string;
  vehicleType: "car" | "rv";
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  licensePlate?: string;
  color?: string;
  purchaseDate?: string;
  purchaseMileage?: number;
  currentMileage: number;
}

interface EditVehicleFormProps {
  vehicle: Vehicle;
}

export default function EditVehicleForm({ vehicle }: EditVehicleFormProps) {
  // Form state - only editable fields
  const vin = useSignal(vehicle.vin || "");
  const licensePlate = useSignal(vehicle.licensePlate || "");
  const color = useSignal(vehicle.color || "");
  const currentMileage = useSignal(vehicle.currentMileage.toString());
  
  const submitting = useSignal(false);
  const deleting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  const showDeleteConfirm = useSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    submitting.value = true;
    error.value = null;
    success.value = null;

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: vin.value || null,
          licensePlate: licensePlate.value || null,
          color: color.value || null,
          currentMileage: parseInt(currentMileage.value) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || "Failed to update vehicle";
        return;
      }

      success.value = "Vehicle updated successfully!";
      
      // Update local state with response
      if (data.currentMileage !== undefined) {
        currentMileage.value = data.currentMileage.toString();
      }
    } catch (err) {
      error.value = "Failed to update vehicle. Please try again.";
      console.error("Update error:", err);
    } finally {
      submitting.value = false;
    }
  };

  const handleDelete = async () => {
    deleting.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        error.value = data.error || "Failed to delete vehicle";
        return;
      }

      // Redirect to vehicles list
      globalThis.location.href = "/vehicles";
    } catch (err) {
      error.value = "Failed to delete vehicle. Please try again.";
      console.error("Delete error:", err);
    } finally {
      deleting.value = false;
      showDeleteConfirm.value = false;
    }
  };

  return (
    <div class="space-y-6">
      {/* Messages */}
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{error.value}</span>
        </div>
      )}

      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start gap-2">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>{success.value}</span>
        </div>
      )}

      {/* Vehicle Info (Read-only) */}
      <div class="bg-gray-50 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h2>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Type:</span>
            <span class="ml-2 font-medium">
              {vehicle.vehicleType === "rv" ? "🏕️ RV" : "🚗 Car"}
            </span>
          </div>
          <div>
            <span class="text-gray-600">Year:</span>
            <span class="ml-2 font-medium">{vehicle.year}</span>
          </div>
          <div>
            <span class="text-gray-600">Make:</span>
            <span class="ml-2 font-medium">{vehicle.make}</span>
          </div>
          <div>
            <span class="text-gray-600">Model:</span>
            <span class="ml-2 font-medium">{vehicle.model}</span>
          </div>
          {vehicle.trim && (
            <div>
              <span class="text-gray-600">Trim:</span>
              <span class="ml-2 font-medium">{vehicle.trim}</span>
            </div>
          )}
          {vehicle.engine && (
            <div>
              <span class="text-gray-600">Engine:</span>
              <span class="ml-2 font-medium">{vehicle.engine}</span>
            </div>
          )}
          {vehicle.transmission && (
            <div>
              <span class="text-gray-600">Transmission:</span>
              <span class="ml-2 font-medium">{vehicle.transmission}</span>
            </div>
          )}
          {vehicle.purchaseDate && (
            <div>
              <span class="text-gray-600">Purchase Date:</span>
              <span class="ml-2 font-medium">
                {new Date(vehicle.purchaseDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {vehicle.purchaseMileage !== undefined && (
            <div>
              <span class="text-gray-600">Purchase Mileage:</span>
              <span class="ml-2 font-medium">
                {vehicle.purchaseMileage.toLocaleString()} mi
              </span>
            </div>
          )}
        </div>
        <p class="text-xs text-gray-500 mt-4">
          * Year, make, model, trim, engine, and transmission cannot be changed after creation.
        </p>
      </div>

      {/* Editable Fields */}
      <form onSubmit={handleSubmit} class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">
          Editable Information
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            href={`/vehicles/${vehicle.id}`}
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
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div class="bg-white rounded-lg shadow-sm p-6 border-2 border-red-200">
        <h2 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p class="text-sm text-gray-600 mb-4">
          Deleting this vehicle will permanently remove all associated maintenance schedules and records.
          This action cannot be undone.
        </p>

        <button
          type="button"
          onClick={() => showDeleteConfirm.value = true}
          class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Delete Vehicle
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteConfirm.value}
        onClose={() => showDeleteConfirm.value = false}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? All associated maintenance schedules and records will be permanently removed. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting.value}
      />
    </div>
  );
}

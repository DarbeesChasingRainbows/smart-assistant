import { useSignal } from "@preact/signals";
import { Spinner } from "../components/Spinner.tsx";

interface VinData {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  vehicleType: string;
  bodyClass: string;
  isRv?: boolean;
}

interface VinLookupProps {
  onVinData?: (data: VinData) => void;
}

export default function VinLookup({ onVinData }: VinLookupProps) {
  const vin = useSignal("");
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const vinData = useSignal<VinData | null>(null);

  const lookupVin = async () => {
    const vinValue = vin.value.trim().toUpperCase();
    
    if (!vinValue) {
      error.value = "Please enter a VIN";
      return;
    }

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vinValue)) {
      error.value = "VIN must be 17 characters (letters and numbers, excluding I, O, Q)";
      return;
    }

    loading.value = true;
    error.value = null;
    vinData.value = null;

    try {
      const response = await fetch("/api/vin-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin: vinValue }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        error.value = data.message || data.details || "VIN lookup failed";
        return;
      }

      vinData.value = data;
      onVinData?.(data);
    } catch (err) {
      error.value = "Failed to connect to VIN lookup service";
      console.error("VIN lookup error:", err);
    } finally {
      loading.value = false;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      lookupVin();
    }
  };

  const clearResults = () => {
    vinData.value = null;
    error.value = null;
  };

  return (
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">
        VIN Lookup (Optional)
      </h2>
      
      <div class="flex gap-3">
        <div class="flex-1 relative">
          <input
            type="text"
            value={vin.value}
            onInput={(e) => {
              vin.value = (e.target as HTMLInputElement).value.toUpperCase();
              clearResults();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter 17-digit VIN"
            maxLength={17}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
            disabled={loading.value}
          />
          {vin.value && (
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {vin.value.length}/17
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={lookupVin}
          disabled={loading.value || vin.value.length !== 17}
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors flex items-center gap-2"
        >
          {loading.value ? (
            <>
              <Spinner size="sm" color="white" />
              Looking up...
            </>
          ) : (
            "Lookup VIN"
          )}
        </button>
      </div>

      <p class="text-xs text-gray-500 mt-2">
        VIN lookup works for US vehicles only. Enter manually if lookup fails.
      </p>

      {/* Error Message */}
      {error.value && (
        <div class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{error.value}</span>
        </div>
      )}

      {/* VIN Data Results */}
      {vinData.value && (
        <div class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span class="font-medium text-green-800">Vehicle Found!</span>
            <span class={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              vinData.value.isRv ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
            }`}>
              {vinData.value.isRv ? "🏕️ RV" : "🚗 Car"}
            </span>
          </div>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-600">Year:</span>
              <span class="ml-2 font-medium">{vinData.value.year}</span>
            </div>
            <div>
              <span class="text-gray-600">Make:</span>
              <span class="ml-2 font-medium">{vinData.value.make}</span>
            </div>
            <div>
              <span class="text-gray-600">Model:</span>
              <span class="ml-2 font-medium">{vinData.value.model}</span>
            </div>
            {vinData.value.trim && (
              <div>
                <span class="text-gray-600">Trim:</span>
                <span class="ml-2 font-medium">{vinData.value.trim}</span>
              </div>
            )}
            {vinData.value.engine && (
              <div>
                <span class="text-gray-600">Engine:</span>
                <span class="ml-2 font-medium">{vinData.value.engine}</span>
              </div>
            )}
            {vinData.value.transmission && (
              <div>
                <span class="text-gray-600">Transmission:</span>
                <span class="ml-2 font-medium">{vinData.value.transmission}</span>
              </div>
            )}
            <div class="col-span-2">
              <span class="text-gray-600">Body Class:</span>
              <span class="ml-2 font-medium">{vinData.value.bodyClass}</span>
            </div>
          </div>

          <p class="text-xs text-green-700 mt-3">
            ✓ Data auto-filled in the form below. Review and adjust as needed.
          </p>
        </div>
      )}
    </div>
  );
}

// Export VinData type for use in other components
export type { VinData };

import { define, url } from "../utils.ts";
import VinLookup from "../islands/VinLookup.tsx";

export default define.page(function VinLookupPage() {
  return (
    <div class="px-4 py-8 mx-auto fresh-gradient min-h-screen">
      <div class="max-w-4xl mx-auto">
        {/* Header */}
        <div class="mb-8">
          <nav class="text-sm mb-4">
            <a href={url("/")} class="text-gray-500 hover:text-gray-700">
              Home
            </a>
            <span class="text-gray-400 mx-2">/</span>
            <span class="text-gray-900">VIN Lookup</span>
          </nav>
          <h1 class="text-4xl font-bold text-gray-800 mb-4">VIN Lookup</h1>
          <p class="text-xl text-gray-600">
            Decode vehicle information using the Vehicle Identification Number
            (VIN)
          </p>
        </div>

        {/* Main Content */}
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-2">
              Vehicle Information Lookup
            </h2>
            <p class="text-gray-600">
              Enter a 17-digit VIN to retrieve vehicle details including make,
              model, year, and more. This service works for US vehicles
              registered with the NHTSA database.
            </p>
          </div>

          {/* VIN Lookup Island */}
          <VinLookup redirectToAddVehicle redirectTo="/vehicles/add" />

          {/* Additional Information */}
          <div class="mt-8 pt-6 border-t border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              About VIN Lookup
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium text-gray-800 mb-2">What is a VIN?</h4>
                <p class="text-sm text-gray-600">
                  A Vehicle Identification Number (VIN) is a unique 17-digit
                  code assigned to every vehicle. It contains information about
                  the vehicle's manufacturer, specifications, and history.
                </p>
              </div>
              <div>
                <h4 class="font-medium text-gray-800 mb-2">
                  Where to find the VIN?
                </h4>
                <ul class="text-sm text-gray-600 space-y-1">
                  <li>• On the dashboard near the windshield</li>
                  <li>• On the driver's side door frame</li>
                  <li>• On vehicle registration documents</li>
                  <li>• On insurance papers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div class="mt-8 flex gap-4">
            <a
              href={url("/vehicles/add")}
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Add Vehicle with VIN Data
            </a>
            <a
              href={url("/")}
              class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
});

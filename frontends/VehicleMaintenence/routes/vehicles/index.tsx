import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { db } from "../../services/database.ts";

interface VehicleData {
  vehicles: Array<{
    id: string;
    vin?: string;
    vehicleType: "car" | "rv";
    make: string;
    model: string;
    year: number;
    trim?: string;
    licensePlate?: string;
    color?: string;
    currentMileage: number;
    createdAt: string;
  }>;
}

export const handler = define.handlers<VehicleData>({
  async GET(_ctx) {
    try {
      const vehicles = await db.getVehicles();
      return page<VehicleData>({ vehicles });
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      // Return empty vehicles array to avoid render errors
      return page<VehicleData>({ vehicles: [] });
    }
  },
});

export default define.page(function VehiclesPage(ctx: PageProps<VehicleData>) {
  const { vehicles } = ctx.data;

  return (
    <>
      <Head>
        <title>My Vehicles - Vehicle Maintenance</title>
      </Head>

      <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
        <div class="max-w-6xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">My Vehicles</h1>
              <p class="text-gray-600 mt-2">Manage your cars and RVs</p>
            </div>
            <a
              href="/vehicles/add"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Vehicle
            </a>
          </div>

          {/* Vehicle Grid */}
          {vehicles.length === 0
            ? (
              <div class="text-center py-12 bg-white rounded-lg shadow-sm">
                <div class="text-gray-400 text-6xl mb-4">🚗</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                  No vehicles yet
                </h3>
                <p class="text-gray-600 mb-6">
                  Add your first vehicle to start tracking maintenance
                </p>
                <a
                  href="/vehicles/add"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors inline-block"
                >
                  Add Your First Vehicle
                </a>
              </div>
            )
            : (
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div class="p-6">
                      {/* Vehicle Type Badge */}
                      <div class="flex justify-between items-start mb-4">
                        <span
                          class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vehicle.vehicleType === "rv"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {vehicle.vehicleType === "rv" ? "🏕️ RV" : "🚗 Car"}
                        </span>
                        <div class="text-gray-500 text-sm">
                          {vehicle.year}
                        </div>
                      </div>

                      {/* Vehicle Info */}
                      <h3 class="text-lg font-semibold text-gray-900 mb-1">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.trim && (
                        <p class="text-sm text-gray-600 mb-3">{vehicle.trim}</p>
                      )}

                      {/* VIN */}
                      {vehicle.vin && (
                        <p class="text-xs text-gray-500 mb-3 font-mono">
                          VIN: {vehicle.vin}
                        </p>
                      )}

                      {/* Current Stats */}
                      <div class="border-t pt-4 space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">Current Mileage:</span>
                          <span class="font-medium">
                            {vehicle.currentMileage.toLocaleString()} mi
                          </span>
                        </div>
                        {vehicle.licensePlate && (
                          <div class="flex justify-between text-sm">
                            <span class="text-gray-600">License Plate:</span>
                            <span class="font-medium">
                              {vehicle.licensePlate}
                            </span>
                          </div>
                        )}
                        {vehicle.color && (
                          <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Color:</span>
                            <span class="font-medium">{vehicle.color}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div class="mt-6 flex gap-2">
                        <a
                          href={`/vehicles/${vehicle.id}`}
                          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors text-center"
                        >
                          View Details
                        </a>
                        <a
                          href={`/vehicles/${vehicle.id}/maintenance`}
                          class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors text-center"
                        >
                          Maintenance
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </>
  );
});

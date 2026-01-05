import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import { db } from "../../../services/database.ts";
import EditVehicleForm from "../../../islands/EditVehicleForm.tsx";

interface EditVehicleData {
  vehicle?: {
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
  };
  error?: string;
}

export const handler = define.handlers<EditVehicleData>({
  async GET(ctx) {
    try {
      const { id } = ctx.params;
      const vehicle = await db.getVehicleById(id);

      if (!vehicle) {
        return page<EditVehicleData>({ error: "Vehicle not found" });
      }

      return page<EditVehicleData>({ vehicle });
    } catch (error) {
      console.error("Failed to fetch vehicle:", error);
      return page<EditVehicleData>({ error: "Failed to load vehicle" });
    }
  },
});

export default define.page(function EditVehiclePage(ctx: PageProps<EditVehicleData>) {
  const { vehicle, error } = ctx.data;

  if (error || !vehicle) {
    return (
      <>
        <Head>
          <title>Error - Vehicle Maintenance</title>
        </Head>
        <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
          <div class="max-w-2xl mx-auto text-center">
            <div class="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p class="text-gray-600 mb-6">{error || "Vehicle not found"}</p>
            <a
              href="/vehicles"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Back to Vehicles
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {vehicle.make} {vehicle.model} - Vehicle Maintenance</title>
      </Head>

      <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
        <div class="max-w-2xl mx-auto">
          {/* Header */}
          <div class="mb-8">
            <a
              href={`/vehicles/${vehicle.id}`}
              class="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Vehicle
            </a>
            <h1 class="text-3xl font-bold text-gray-900 mt-2">
              Edit {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p class="text-gray-600 mt-2">
              Update vehicle information and mileage
            </p>
          </div>

          {/* Edit Form Island */}
          <EditVehicleForm vehicle={vehicle} />
        </div>
      </div>
    </>
  );
});

import { page, PageProps } from "fresh";
import { Head } from "fresh/runtime";
import { define, url } from "../../utils.ts";
import { db } from "../../services/database.ts";

interface VehicleDetailData {
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
    createdAt: string;
    updatedAt: string;
  };
  schedules?: Array<{
    id: string;
    itemName: string;
    description?: string;
    intervalType: "mileage" | "time" | "both";
    mileageInterval?: number;
    timeIntervalMonths?: number;
    priority: number;
    estimatedCost?: number;
    estimatedHours?: number;
  }>;
  dueMaintenance?: Array<{
    id: string;
    scheduleId: string;
    nextDueMileage?: number;
    nextDueDate?: string;
    lastMileage: number;
    lastServiceDate?: string;
    status: "pending" | "completed" | "overdue";
    itemName: string;
    description?: string;
  }>;
  recentRecords?: Array<{
    id: string;
    itemName: string;
    maintenanceDate: string;
    mileageAtService?: number; // Optional for historical records
    actualCost?: number;
    actualHours?: number;
    serviceProvider?: string;
    notes?: string;
  }>;
  error?: string;
}

export const handler = define.handlers<VehicleDetailData>({
  async GET(ctx) {
    try {
      const { id } = ctx.params;
      const vehicle = await db.getVehicleById(id);

      if (!vehicle) {
        return page<VehicleDetailData>({ error: "Vehicle not found" });
      }

      const [schedules, dueMaintenance, records] = await Promise.all([
        db.getVehicleSchedules(id),
        db.getDueMaintenance(id),
        db.getVehicleRecords(id),
      ]);

      // Join due maintenance with schedule info
      const dueWithDetails = dueMaintenance.map((due) => {
        const schedule = schedules.find((s) => s.id === due.scheduleId);
        return {
          ...due,
          itemName: schedule?.itemName || "Unknown",
          description: schedule?.description,
        };
      });

      // Join recent records with schedule info
      const recentRecords = records.slice(0, 5).map((record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        return {
          ...record,
          itemName: schedule?.itemName || "Unknown",
        };
      });

      return page<VehicleDetailData>({
        vehicle,
        schedules,
        dueMaintenance: dueWithDetails,
        recentRecords,
      });
    } catch (error) {
      console.error("Failed to fetch vehicle details:", error);
      return page<VehicleDetailData>({
        error: "Failed to load vehicle details",
      });
    }
  },
});

export default define.page(
  function VehicleDetailPage(ctx: PageProps<VehicleDetailData>) {
    const { vehicle, schedules, dueMaintenance, recentRecords, error } =
      ctx.data;

    if (error) {
      return (
        <>
          <Head>
            <title>Error - Vehicle Maintenance</title>
          </Head>
          <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
            <div class="max-w-2xl mx-auto text-center">
              <div class="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Error</h1>
              <p class="text-gray-600 mb-6">{error}</p>
              <a
                href={url("/vehicles")}
                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Back to Vehicles
              </a>
            </div>
          </div>
        </>
      );
    }

    if (!vehicle) return null;

    const isOverdue = (
      due: { nextDueDate?: string; nextDueMileage?: number; status: string },
    ) => {
      if (
        due.nextDueMileage && due.nextDueMileage <= vehicle.currentMileage
      ) return true;
      if (due.nextDueDate && new Date(due.nextDueDate) <= new Date()) {
        return true;
      }
      return false;
    };

    const getPriorityColor = (priority: number) => {
      switch (priority) {
        case 1:
          return "text-red-600 bg-red-50";
        case 2:
          return "text-yellow-600 bg-yellow-50";
        case 3:
          return "text-green-600 bg-green-50";
        default:
          return "text-gray-600 bg-gray-50";
      }
    };

    return (
      <>
        <Head>
          <title>{vehicle.make} {vehicle.model} - Vehicle Maintenance</title>
        </Head>

        <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
          <div class="max-w-6xl mx-auto">
            {/* Header */}
            <div class="flex justify-between items-start mb-8">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <a
                    href={url("/vehicles")}
                    class="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    ← Back to Vehicles
                  </a>
                </div>
                <h1 class="text-3xl font-bold text-gray-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.trim && (
                  <p class="text-gray-600 mt-1">{vehicle.trim}</p>
                )}
              </div>
              <div class="flex gap-2">
                <a
                  href={url(`/vehicles/${vehicle.id}/maintenance`)}
                  class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Add Maintenance
                </a>
                <a
                  href={url(`/vehicles/${vehicle.id}/edit`)}
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Edit Vehicle
                </a>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle Info */}
              <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">
                    Vehicle Information
                  </h2>

                  <div class="space-y-3">
                    <div class="flex items-center gap-2">
                      <span
                        class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vehicle.vehicleType === "rv"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {vehicle.vehicleType === "rv" ? "🏕️ RV" : "🚗 Car"}
                      </span>
                    </div>

                    {vehicle.vin && (
                      <div>
                        <span class="text-sm text-gray-600">VIN:</span>
                        <p class="font-mono text-sm">{vehicle.vin}</p>
                      </div>
                    )}

                    <div>
                      <span class="text-sm text-gray-600">
                        Current Mileage:
                      </span>
                      <p class="font-semibold">
                        {vehicle.currentMileage.toLocaleString()} miles
                      </p>
                    </div>

                    {vehicle.licensePlate && (
                      <div>
                        <span class="text-sm text-gray-600">
                          License Plate:
                        </span>
                        <p>{vehicle.licensePlate}</p>
                      </div>
                    )}

                    {vehicle.color && (
                      <div>
                        <span class="text-sm text-gray-600">Color:</span>
                        <p>{vehicle.color}</p>
                      </div>
                    )}

                    {vehicle.engine && (
                      <div>
                        <span class="text-sm text-gray-600">Engine:</span>
                        <p>{vehicle.engine}</p>
                      </div>
                    )}

                    {vehicle.transmission && (
                      <div>
                        <span class="text-sm text-gray-600">Transmission:</span>
                        <p>{vehicle.transmission}</p>
                      </div>
                    )}

                    {vehicle.purchaseDate && (
                      <div>
                        <span class="text-sm text-gray-600">
                          Purchase Date:
                        </span>
                        <p>
                          {new Date(vehicle.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {vehicle.purchaseMileage && (
                      <div>
                        <span class="text-sm text-gray-600">
                          Purchase Mileage:
                        </span>
                        <p>{vehicle.purchaseMileage.toLocaleString()} miles</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div class="lg:col-span-2 space-y-6">
                {/* Due Maintenance */}
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">
                    Upcoming Maintenance
                  </h2>

                  {dueMaintenance && dueMaintenance.length > 0
                    ? (
                      <div class="space-y-3">
                        {dueMaintenance.map((due) => (
                          <div
                            key={due.id}
                            class={`border rounded-lg p-4 ${
                              isOverdue(due)
                                ? "border-red-200 bg-red-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div class="flex justify-between items-start">
                              <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                  <h3 class="font-medium text-gray-900">
                                    {due.itemName}
                                  </h3>
                                  <span
                                    class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      getPriorityColor(
                                        due.status === "overdue" ? 1 : 2,
                                      )
                                    }`}
                                  >
                                    {isOverdue(due) ? "Overdue" : "Due Soon"}
                                  </span>
                                </div>
                                {due.description && (
                                  <p class="text-sm text-gray-600 mb-2">
                                    {due.description}
                                  </p>
                                )}

                                <div class="text-sm text-gray-500 space-y-1">
                                  {due.nextDueMileage && (
                                    <div>
                                      Due at:{" "}
                                      {due.nextDueMileage.toLocaleString()}{" "}
                                      miles
                                      {vehicle.currentMileage >
                                          due.lastMileage && (
                                        <span class="ml-2 text-red-600">
                                          ({(due.nextDueMileage -
                                            vehicle.currentMileage)
                                            .toLocaleString()} miles remaining)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {due.nextDueDate && (
                                    <div>
                                      Due by: {new Date(due.nextDueDate)
                                        .toLocaleDateString()}
                                      {new Date(due.nextDueDate) <=
                                          new Date() && (
                                        <span class="ml-2 text-red-600">
                                          (Overdue)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {due.lastServiceDate && (
                                    <div>
                                      Last service:{" "}
                                      {new Date(due.lastServiceDate)
                                        .toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <a
                                href={url(
                                  `/vehicles/${vehicle.id}/maintenance?schedule=${due.scheduleId}`,
                                )}
                                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-sm transition-colors"
                              >
                                Record Service
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    : (
                      <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">🔧</div>
                        <p>No maintenance scheduled</p>
                      </div>
                    )}
                </div>

                {/* Recent Maintenance */}
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-gray-900">
                      Recent Maintenance
                    </h2>
                    <a
                      href={url(`/vehicles/${vehicle.id}/maintenance`)}
                      class="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View All →
                    </a>
                  </div>

                  {recentRecords && recentRecords.length > 0
                    ? (
                      <div class="space-y-3">
                        {recentRecords.map((record) => (
                          <div
                            key={record.id}
                            class="border-b border-gray-200 pb-3 last:border-b-0"
                          >
                            <div class="flex justify-between items-start">
                              <div>
                                <h3 class="font-medium text-gray-900">
                                  {record.itemName}
                                </h3>
                                <p class="text-sm text-gray-600">
                                  {new Date(record.maintenanceDate)
                                    .toLocaleDateString()}
                                  {record.mileageAtService && (
                                    <span>
                                      •{" "}
                                      {record.mileageAtService.toLocaleString()}
                                      {" "}
                                      miles
                                    </span>
                                  )}
                                </p>
                                {record.serviceProvider && (
                                  <p class="text-sm text-gray-500">
                                    {record.serviceProvider}
                                  </p>
                                )}
                                {record.actualCost && (
                                  <p class="text-sm font-medium text-green-600">
                                    ${record.actualCost.toFixed(2)}
                                  </p>
                                )}
                                {record.notes && (
                                  <p class="text-sm text-gray-500 mt-1">
                                    {record.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    : (
                      <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">📋</div>
                        <p>No maintenance records yet</p>
                        <a
                          href={url(`/vehicles/${vehicle.id}/maintenance`)}
                          class="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                        >
                          Add first maintenance record
                        </a>
                      </div>
                    )}
                </div>

                {/* Maintenance Schedule */}
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">
                    Maintenance Schedule
                  </h2>

                  {schedules && schedules.length > 0
                    ? (
                      <div class="space-y-2">
                        {schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <h3 class="font-medium text-gray-900">
                                {schedule.itemName}
                              </h3>
                              <p class="text-sm text-gray-600">
                                {schedule.intervalType === "mileage" &&
                                  `Every ${schedule.mileageInterval?.toLocaleString()} miles`}
                                {schedule.intervalType === "time" &&
                                  `Every ${schedule.timeIntervalMonths} months`}
                                {schedule.intervalType === "both" &&
                                  `Every ${schedule.mileageInterval?.toLocaleString()} miles or ${schedule.timeIntervalMonths} months`}
                              </p>
                            </div>
                            <span
                              class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                getPriorityColor(schedule.priority)
                              }`}
                            >
                              Priority {schedule.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                    : (
                      <div class="text-center py-8 text-gray-500">
                        <p>No maintenance schedule configured</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

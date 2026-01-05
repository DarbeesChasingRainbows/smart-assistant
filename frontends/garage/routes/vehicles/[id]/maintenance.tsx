import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define, url } from "../../../utils.ts";
import { db } from "../../../services/database.ts";
import { ValidationError, Validator } from "../../../utils/validation.ts";

interface MaintenancePageData {
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    vehicleType: "car" | "rv";
    currentMileage: number;
  };
  schedules?: Array<{
    id: string;
    itemName: string;
    description?: string;
    intervalType: "mileage" | "time" | "both";
    mileageInterval?: number;
    timeIntervalMonths?: number;
    priority: number;
  }>;
  records?: Array<{
    id: string;
    scheduleId: string;
    itemName: string;
    maintenanceDate: string;
    mileageAtService?: number; // Optional for historical records
    actualCost?: number;
    actualHours?: number;
    serviceProvider?: string;
    notes?: string;
    receiptUrl?: string;
  }>;
  error?: string;
  success?: string;
  preselectedSchedule?: string;
  isPastMaintenance?: boolean;
}

export const handler = define.handlers<MaintenancePageData>({
  async GET(ctx) {
    try {
      const { id } = ctx.params;
      const url = new URL(ctx.req.url);
      const preselectedSchedule: string | undefined =
        url.searchParams.get("schedule") ?? undefined;
      const isPastMaintenance = url.searchParams.get("past") === "true";

      const [vehicle, schedules, records] = await Promise.all([
        db.getVehicleById(id),
        db.getVehicleSchedules(id),
        db.getVehicleRecords(id),
      ]);

      if (!vehicle) {
        return page<MaintenancePageData>({ error: "Vehicle not found" });
      }

      // Join records with schedule info
      const recordsWithDetails = records.map((record) => {
        const schedule = schedules.find((s) => s.id === record.scheduleId);
        return {
          ...record,
          itemName: schedule?.itemName || "Unknown",
        };
      });

      return page<MaintenancePageData>({
        vehicle,
        schedules,
        records: recordsWithDetails,
        preselectedSchedule,
        isPastMaintenance,
      });
    } catch (error) {
      console.error("Failed to fetch maintenance page data:", error);
      return page<MaintenancePageData>({
        error: "Failed to load maintenance page",
      });
    }
  },

  async POST(ctx) {
    try {
      const { id } = ctx.params;
      const formData = await ctx.req.formData();

      // Validate and sanitize form data
      const scheduleId = Validator.validateUuid(
        formData.get("scheduleId") as string,
      );
      const maintenanceDate = Validator.validateRequiredDate(
        formData.get("maintenanceDate") as string,
      );
      
      // Mileage is now optional - useful for historical records
      const mileageRaw = formData.get("mileageAtService") as string;
      const mileageAtService = mileageRaw && mileageRaw.trim() !== "" 
        ? Validator.validateMileage(mileageRaw)
        : undefined;
      
      const actualCost = Validator.validateCost(
        formData.get("actualCost") as string,
      );
      const actualHours = Validator.validateHours(
        formData.get("actualHours") as string,
      );
      const serviceProvider = Validator.validateServiceProvider(
        formData.get("serviceProvider") as string,
      );
      const notes = Validator.validateText(
        formData.get("notes") as string,
        "Notes",
        1000,
      );
      const receiptUrl = Validator.validateText(
        formData.get("receiptUrl") as string,
        "Receipt URL",
        500,
      );

      // Create maintenance record
      const _recordId = await db.createMaintenanceRecord({
        vehicleId: id,
        scheduleId,
        maintenanceDate,
        mileageAtService,
        status: "completed",
        actualCost: actualCost || undefined,
        actualHours: actualHours || undefined,
        serviceProvider: serviceProvider || undefined,
        notes: notes || undefined,
        receiptUrl: receiptUrl || undefined,
      });

      // Redirect to vehicle details
      return new Response("", {
        status: 303,
        headers: { Location: `/vehicles/${id}` },
      });
    } catch (error) {
      console.error("Failed to create maintenance record:", error);

      if (error instanceof ValidationError) {
        return page<MaintenancePageData>({ error: error.message });
      }

      return page<MaintenancePageData>({
        error: "Failed to create maintenance record. Please try again.",
      });
    }
  },
});

export default define.page(
  function MaintenancePage(ctx: PageProps<MaintenancePageData>) {
    const { vehicle, schedules, records, error, preselectedSchedule, isPastMaintenance } =
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

    return (
      <>
        <Head>
          <title>Add Maintenance - {vehicle.make} {vehicle.model}</title>
        </Head>

        <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
          <div class="max-w-4xl mx-auto">
            {/* Header */}
            <div class="flex justify-between items-start mb-8">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <a
                    href={url(`/vehicles/${vehicle.id}`)}
                    class="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    ← Back to {vehicle.make} {vehicle.model}
                  </a>
                </div>
                <h1 class="text-3xl font-bold text-gray-900">
                  {isPastMaintenance ? "Add Past Maintenance" : "Add Maintenance Record"}
                </h1>
                <p class="text-gray-600 mt-1">
                  {isPastMaintenance 
                    ? "Record previously completed maintenance service" 
                    : "Record completed maintenance service"}
                </p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div class="mb-6 flex gap-2">
              <a
                href={url(`/vehicles/${vehicle.id}/maintenance`)}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isPastMaintenance
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                🔧 Record Recent Service
              </a>
              <a
                href={url(`/vehicles/${vehicle.id}/maintenance?past=true`)}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isPastMaintenance
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📜 Add Past Maintenance
              </a>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Maintenance Form */}
              <div>
                <form method="POST" class="bg-white rounded-lg shadow-sm p-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">
                    {isPastMaintenance ? "Past Service Details" : "Service Details"}
                  </h2>
                  
                  {isPastMaintenance && (
                    <div class="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm">
                      💡 Adding historical maintenance? Mileage is optional if you don't remember it.
                    </div>
                  )}

                  {error && (
                    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                      {error}
                    </div>
                  )}

                  <div class="space-y-4">
                    {/* Maintenance Item */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Maintenance Item *
                      </label>
                      <select
                        name="scheduleId"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select maintenance item</option>
                        {schedules?.map((schedule) => (
                          <option
                            key={schedule.id}
                            value={schedule.id}
                            selected={preselectedSchedule === schedule.id}
                          >
                            {schedule.itemName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Date */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Service Date *
                      </label>
                      <input
                        type="date"
                        name="maintenanceDate"
                        required
                        max={new Date().toISOString().split("T")[0]}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Mileage at Service */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Mileage at Service {isPastMaintenance ? "(optional)" : ""}
                      </label>
                      <input
                        type="number"
                        name="mileageAtService"
                        min="0"
                        placeholder={isPastMaintenance ? "Leave blank if unknown" : vehicle.currentMileage.toString()}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p class="text-xs text-gray-500 mt-1">
                        {isPastMaintenance 
                          ? "Enter the mileage at time of service if you remember it"
                          : `Current odometer: ${vehicle.currentMileage.toLocaleString()} miles`}
                      </p>
                    </div>

                    {/* Actual Cost */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Actual Cost ($)
                      </label>
                      <input
                        type="number"
                        name="actualCost"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Actual Hours */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Time Spent (hours)
                      </label>
                      <input
                        type="number"
                        name="actualHours"
                        min="0"
                        step="0.25"
                        placeholder="0.0"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Service Provider */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Service Provider
                      </label>
                      <input
                        type="text"
                        name="serviceProvider"
                        placeholder="e.g., Quick Lube, DIY, Dealer"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        rows={3}
                        placeholder="Additional details about the service..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div class="mt-6 flex gap-3">
                    <a
                      href={url(`/vehicles/${vehicle.id}`)}
                      class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </a>
                    <button
                      type="submit"
                      class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      Record Maintenance
                    </button>
                  </div>
                </form>
              </div>

              {/* Recent History */}
              <div>
                <div class="bg-white rounded-lg shadow-sm p-6">
                  <h2 class="text-lg font-semibold text-gray-900 mb-4">
                    Recent Maintenance History
                  </h2>

                  {records && records.length > 0
                    ? (
                      <div class="space-y-4 max-h-96 overflow-y-auto">
                        {records.slice(0, 10).map((record) => (
                          <div
                            key={record.id}
                            class="border-b border-gray-200 pb-3 last:border-b-0"
                          >
                            <div class="flex justify-between items-start">
                              <div class="flex-1">
                                <h3 class="font-medium text-gray-900">
                                  {record.itemName}
                                </h3>
                                <p class="text-sm text-gray-600 mt-1">
                                  {new Date(record.maintenanceDate)
                                    .toLocaleDateString()}
                                  {record.mileageAtService && (
                                    <span> • {record.mileageAtService.toLocaleString()} miles</span>
                                  )}
                                </p>
                                {record.serviceProvider && (
                                  <p class="text-sm text-gray-500">
                                    {record.serviceProvider}
                                  </p>
                                )}
                                {record.actualCost && (
                                  <p class="text-sm font-medium text-green-600 mt-1">
                                    ${record.actualCost.toFixed(2)}
                                  </p>
                                )}
                                {record.actualHours && (
                                  <p class="text-sm text-blue-600">
                                    {record.actualHours} hours
                                  </p>
                                )}
                                {record.notes && (
                                  <p class="text-sm text-gray-500 mt-2 italic">
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
                        <p class="text-sm mt-1">
                          Your first record will appear here
                        </p>
                      </div>
                    )}

                  {records && records.length > 0 && (
                    <div class="mt-4 pt-4 border-t border-gray-200">
                      <a
                        href={url(`/vehicles/${vehicle.id}`)}
                        class="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View Full History →
                      </a>
                    </div>
                  )}
                </div>

                {/* Maintenance Schedule Info */}
                <div class="bg-blue-50 rounded-lg p-4 mt-6">
                  <h3 class="font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
                  <p class="text-sm text-blue-700">
                    Keep detailed maintenance records to help maintain your
                    vehicle's resale value and ensure warranty coverage. Include
                    receipts and document all service performed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

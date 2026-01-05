import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define, url } from "../../utils.ts";
import { GarageApiClient } from "../../utils/api.ts";
import type { MaintenanceRecord, Vehicle } from "../../utils/contracts.ts";

interface HistoryData {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  };
  error?: string;
}

export const handler = define.handlers<HistoryData>({
  async GET(ctx) {
    try {
      const url = new URL(ctx.req.url);
      const pageNum = parseInt(url.searchParams.get("page") || "1");
      const vehicleId = url.searchParams.get("vehicle") || undefined;
      const startDate = url.searchParams.get("start") || undefined;
      const endDate = url.searchParams.get("end") || undefined;

      const api = new GarageApiClient();
      
      const [records, vehicles] = await Promise.all([
        api.getMaintenanceRecords(vehicleId),
        api.getVehicles(),
      ]);

      // TODO: Implement client-side pagination and filtering
      // For now, return all records
      return page<HistoryData>({
        records,
        vehicles,
        total: records.length,
        page: pageNum,
        totalPages: 1,
        filters: { vehicleId, startDate, endDate },
      });
    } catch (error) {
      console.error("Failed to fetch maintenance history:", error);
      return page<HistoryData>({
        records: [],
        vehicles: [],
        total: 0,
        page: 1,
        totalPages: 1,
        filters: {},
        error: "Failed to load maintenance history",
      });
    }
  },
});

export default define.page(function HistoryPage(ctx: PageProps<HistoryData>) {
  const { records, vehicles, total, page: currentPage, totalPages, filters, error } = ctx.data;

  // Helper function to get vehicle name
  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }
    return "Unknown Vehicle";
  };

  const buildUrl = (params: Record<string, string | number | undefined>) => {
    const url = new URL("/maintenance/history", "http://localhost");
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    return url.pathname + url.search;
  };

  return (
    <>
      <Head>
        <title>Maintenance History - Vehicle Maintenance</title>
      </Head>

      <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
        <div class="max-w-6xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <a href={url("/")} class="text-blue-600 hover:text-blue-700 text-sm">
                ← Back to Dashboard
              </a>
              <h1 class="text-3xl font-bold text-gray-900 mt-2">Maintenance History</h1>
              <p class="text-gray-600 mt-1">
                {total} total records
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Filters */}
          <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Vehicle Filter */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle
                </label>
                <select
                  name="vehicle"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Vehicles</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id} selected={filters.vehicleId === v.id}>
                      {`${v.year} ${v.make} ${v.model}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  name="start"
                  value={filters.startDate || ""}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  name="end"
                  value={filters.endDate || ""}
                  max={new Date().toISOString().split("T")[0]}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Button */}
              <div class="flex items-end gap-2">
                <button
                  type="submit"
                  class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Apply Filters
                </button>
                <a
                  href={url("/maintenance/history")}
                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Clear
                </a>
              </div>
            </form>
          </div>

          {/* Records Table */}
          <div class="bg-white rounded-lg shadow-sm overflow-hidden">
            {records.length > 0 ? (
              <>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mileage
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      {records.map((record) => (
                        <tr key={record.id} class="hover:bg-gray-50">
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.maintenanceDate).toLocaleDateString()}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap">
                            <a
                              href={url(`/vehicles/${record.vehicleId}`)}
                              class="text-sm text-blue-600 hover:text-blue-700"
                            >
                              {getVehicleName(record.vehicleId)}
                            </a>
                          </td>
                          <td class="px-6 py-4">
                            <div class="text-sm font-medium text-gray-900">
                              {record.itemName}
                            </div>
                            {record.notes && (
                              <div class="text-xs text-gray-500 truncate max-w-xs">
                                {record.notes}
                              </div>
                            )}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === 'completed' ? 'bg-green-100 text-green-800' :
                              record.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              record.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {record.mileage ? `${record.mileage.toLocaleString()} mi` : "—"}
                          </td>
                          <td class="px-6 py-4 whitespace-nowrap text-sm">
                            {record.actualCost ? (
                              <span class="font-medium text-green-600">
                                ${record.actualCost.toFixed(2)}
                              </span>
                            ) : (
                              <span class="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                    <div class="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} ({total} records)
                    </div>
                    <div class="flex gap-2">
                      {currentPage > 1 && (
                        <a
                          href={buildUrl({ ...filters, page: currentPage - 1 })}
                          class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
                        >
                          Previous
                        </a>
                      )}
                      {currentPage < totalPages && (
                        <a
                          href={buildUrl({ ...filters, page: currentPage + 1 })}
                          class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
                        >
                          Next
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div class="text-center py-12 text-gray-500">
                <div class="text-4xl mb-2">📋</div>
                <p class="text-lg">No maintenance records found</p>
                {(filters.vehicleId || filters.startDate || filters.endDate) && (
                  <p class="text-sm mt-2">
                    Try adjusting your filters or{" "}
                    <a href="/maintenance/history" class="text-blue-600 hover:text-blue-700">
                      clear all filters
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

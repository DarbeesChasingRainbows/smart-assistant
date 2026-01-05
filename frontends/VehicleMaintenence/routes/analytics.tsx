import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../services/database.ts";

interface AnalyticsData {
  analytics: {
    totalSpent: number;
    averagePerService: number;
    totalServices: number;
    costByMonth: Array<{ month: string; cost: number; count: number }>;
    costByVehicle: Array<{ vehicleId: string; vehicleName: string; cost: number; count: number }>;
    costByCategory: Array<{ category: string; cost: number; count: number }>;
  };
  vehicles: Array<{
    id: string;
    name: string;
  }>;
  filters: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  };
  error?: string;
}

export const handler = define.handlers<AnalyticsData>({
  async GET(ctx) {
    try {
      const url = new URL(ctx.req.url);
      const vehicleId = url.searchParams.get("vehicle") || undefined;
      const startDate = url.searchParams.get("start") || undefined;
      const endDate = url.searchParams.get("end") || undefined;

      const [analytics, vehiclesList] = await Promise.all([
        db.getCostAnalytics({ vehicleId, startDate, endDate }),
        db.getVehicles(),
      ]);

      const vehicles = vehiclesList.map((v) => ({
        id: v.id,
        name: `${v.year} ${v.make} ${v.model}`,
      }));

      return page<AnalyticsData>({
        analytics,
        vehicles,
        filters: { vehicleId, startDate, endDate },
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      return page<AnalyticsData>({
        analytics: {
          totalSpent: 0,
          averagePerService: 0,
          totalServices: 0,
          costByMonth: [],
          costByVehicle: [],
          costByCategory: [],
        },
        vehicles: [],
        filters: {},
        error: "Failed to load analytics data",
      });
    }
  },
});

export default define.page(function AnalyticsPage(ctx: PageProps<AnalyticsData>) {
  const { analytics, vehicles, filters, error } = ctx.data;

  // Calculate max values for bar charts
  const maxMonthlyCost = Math.max(...analytics.costByMonth.map((m) => Number(m.cost)), 1);
  const maxCategoryCost = Math.max(...analytics.costByCategory.map((c) => Number(c.cost)), 1);
  const maxVehicleCost = Math.max(...analytics.costByVehicle.map((v) => Number(v.cost)), 1);

  return (
    <>
      <Head>
        <title>Cost Analytics - Vehicle Maintenance</title>
      </Head>

      <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <a href="/" class="text-blue-600 hover:text-blue-700 text-sm">
                ← Back to Dashboard
              </a>
              <h1 class="text-3xl font-bold text-gray-900 mt-2">Cost Analytics</h1>
              <p class="text-gray-600 mt-1">Track your maintenance spending</p>
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
                      {v.name}
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
                  href="/analytics"
                  class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Clear
                </a>
              </div>
            </form>
          </div>

          {/* Summary Cards */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Spent */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Spent</p>
                  <p class="text-3xl font-bold text-green-600">
                    ${analytics.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div class="text-4xl">💰</div>
              </div>
            </div>

            {/* Average Per Service */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Average Per Service</p>
                  <p class="text-3xl font-bold text-blue-600">
                    ${analytics.averagePerService.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div class="text-4xl">📊</div>
              </div>
            </div>

            {/* Total Services */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Services</p>
                  <p class="text-3xl font-bold text-gray-900">{analytics.totalServices}</p>
                </div>
                <div class="text-4xl">🔧</div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Spending Chart */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Monthly Spending (Last 12 Months)</h2>
              {analytics.costByMonth.length > 0 ? (
                <div class="space-y-3">
                  {analytics.costByMonth.slice(0, 12).reverse().map((month) => {
                    const percentage = (Number(month.cost) / maxMonthlyCost) * 100;
                    const monthDate = new Date(month.month + "-01");
                    const monthName = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                    return (
                      <div key={month.month}>
                        <div class="flex justify-between text-sm mb-1">
                          <span class="text-gray-600">{monthName}</span>
                          <span class="font-medium">
                            ${Number(month.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span class="text-gray-400 ml-1">({month.count} services)</span>
                          </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div
                            class="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  <p>No spending data available</p>
                </div>
              )}
            </div>

            {/* Cost by Category */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Top Spending Categories</h2>
              {analytics.costByCategory.length > 0 ? (
                <div class="space-y-3">
                  {analytics.costByCategory.map((category, index) => {
                    const percentage = (Number(category.cost) / maxCategoryCost) * 100;
                    const colors = [
                      "bg-green-500",
                      "bg-blue-500",
                      "bg-yellow-500",
                      "bg-purple-500",
                      "bg-pink-500",
                      "bg-indigo-500",
                      "bg-red-500",
                      "bg-orange-500",
                      "bg-teal-500",
                      "bg-cyan-500",
                    ];
                    return (
                      <div key={category.category}>
                        <div class="flex justify-between text-sm mb-1">
                          <span class="text-gray-600 truncate max-w-[200px]">{category.category}</span>
                          <span class="font-medium">
                            ${Number(category.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span class="text-gray-400 ml-1">({category.count})</span>
                          </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div
                            class={`${colors[index % colors.length]} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  <p>No category data available</p>
                </div>
              )}
            </div>

            {/* Cost by Vehicle */}
            <div class="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Spending by Vehicle</h2>
              {analytics.costByVehicle.length > 0 ? (
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.costByVehicle.map((vehicle) => {
                    const percentage = (Number(vehicle.cost) / maxVehicleCost) * 100;
                    return (
                      <div key={vehicle.vehicleId} class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                          <a
                            href={`/vehicles/${vehicle.vehicleId}`}
                            class="font-medium text-blue-600 hover:text-blue-700"
                          >
                            {vehicle.vehicleName}
                          </a>
                          <span class="text-lg font-bold text-green-600">
                            ${Number(vehicle.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div class="text-sm text-gray-500 mb-2">
                          {vehicle.count} service{vehicle.count !== 1 ? "s" : ""}
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div
                            class="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  <p>No vehicle spending data available</p>
                  <a href="/vehicles/add" class="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                    Add your first vehicle
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Export Section */}
          <div class="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Export Data</h2>
            <p class="text-gray-600 mb-4">
              Download your maintenance records for external analysis or record keeping.
            </p>
            <div class="flex gap-4">
              <a
                href="/maintenance/history"
                class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
              >
                View Full History
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

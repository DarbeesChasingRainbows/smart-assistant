import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { db } from "../services/database.ts";

interface DashboardData {
  stats: {
    totalVehicles: number;
    totalCars: number;
    totalRvs: number;
    upcomingMaintenance: number;
    overdueMaintenance: number;
    totalSpent: number;
    totalRecords: number;
    recentRecords: Array<{
      id: string;
      vehicleId: string;
      vehicleName: string;
      itemName: string;
      maintenanceDate: string;
      actualCost?: number;
    }>;
    upcomingItems: Array<{
      id: string;
      vehicleId: string;
      vehicleName: string;
      itemName: string;
      nextDueDate?: string;
      nextDueMileage?: number;
      status: string;
    }>;
  };
  error?: string;
}

export const handler = define.handlers<DashboardData>({
  async GET(_ctx) {
    try {
      const stats = await db.getDashboardStats();
      return page<DashboardData>({ stats });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      return page<DashboardData>({
        stats: {
          totalVehicles: 0,
          totalCars: 0,
          totalRvs: 0,
          upcomingMaintenance: 0,
          overdueMaintenance: 0,
          totalSpent: 0,
          totalRecords: 0,
          recentRecords: [],
          upcomingItems: [],
        },
        error: "Failed to load dashboard data",
      });
    }
  },
});

export default define.page(function DashboardPage(ctx: PageProps<DashboardData>) {
  const { stats, error } = ctx.data;

  return (
    <>
      <Head>
        <title>Dashboard - Vehicle Maintenance</title>
      </Head>

      <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto">
          {/* Header */}
          <div class="flex justify-between items-center mb-8">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p class="text-gray-600 mt-1">Vehicle maintenance overview</p>
            </div>
            <a
              href="/vehicles/add"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Vehicle
            </a>
          </div>

          {/* Error Message */}
          {error && (
            <div class="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Vehicles */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Vehicles</p>
                  <p class="text-3xl font-bold text-gray-900">{stats.totalVehicles}</p>
                </div>
                <div class="text-4xl">🚗</div>
              </div>
              <div class="mt-2 text-sm text-gray-500">
                {stats.totalCars} cars • {stats.totalRvs} RVs
              </div>
            </div>

            {/* Upcoming Maintenance */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Upcoming</p>
                  <p class="text-3xl font-bold text-blue-600">{stats.upcomingMaintenance}</p>
                </div>
                <div class="text-4xl">📅</div>
              </div>
              <div class="mt-2 text-sm text-gray-500">
                maintenance items due
              </div>
            </div>

            {/* Overdue */}
            <div class={`bg-white rounded-lg shadow-sm p-6 ${stats.overdueMaintenance > 0 ? "ring-2 ring-red-200" : ""}`}>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Overdue</p>
                  <p class={`text-3xl font-bold ${stats.overdueMaintenance > 0 ? "text-red-600" : "text-gray-900"}`}>
                    {stats.overdueMaintenance}
                  </p>
                </div>
                <div class="text-4xl">⚠️</div>
              </div>
              <div class="mt-2 text-sm text-gray-500">
                needs attention
              </div>
            </div>

            {/* Total Spent */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Spent</p>
                  <p class="text-3xl font-bold text-green-600">
                    ${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div class="text-4xl">💰</div>
              </div>
              <div class="mt-2 text-sm text-gray-500">
                {stats.totalRecords} service records
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Maintenance */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-gray-900">Upcoming Maintenance</h2>
                <a href="/vehicles" class="text-blue-600 hover:text-blue-700 text-sm">
                  View All →
                </a>
              </div>

              {stats.upcomingItems.length > 0 ? (
                <div class="space-y-3">
                  {stats.upcomingItems.map((item) => (
                    <a
                      key={item.id}
                      href={`/vehicles/${item.vehicleId}`}
                      class={`block border rounded-lg p-3 hover:bg-gray-50 transition-colors ${
                        item.status === "overdue" ? "border-red-200 bg-red-50" : "border-gray-200"
                      }`}
                    >
                      <div class="flex justify-between items-start">
                        <div>
                          <h3 class="font-medium text-gray-900">{item.itemName}</h3>
                          <p class="text-sm text-gray-600">{item.vehicleName}</p>
                        </div>
                        <span class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.status === "overdue" 
                            ? "bg-red-100 text-red-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {item.status === "overdue" ? "Overdue" : "Due Soon"}
                        </span>
                      </div>
                      <div class="mt-2 text-xs text-gray-500">
                        {item.nextDueDate && (
                          <span>Due: {new Date(item.nextDueDate).toLocaleDateString()}</span>
                        )}
                        {item.nextDueDate && item.nextDueMileage && <span> • </span>}
                        {item.nextDueMileage && (
                          <span>{item.nextDueMileage.toLocaleString()} miles</span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  <div class="text-4xl mb-2">✅</div>
                  <p>No upcoming maintenance</p>
                </div>
              )}
            </div>

            {/* Recent Maintenance */}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-gray-900">Recent Maintenance</h2>
                <a href="/maintenance/history" class="text-blue-600 hover:text-blue-700 text-sm">
                  View All →
                </a>
              </div>

              {stats.recentRecords.length > 0 ? (
                <div class="space-y-3">
                  {stats.recentRecords.map((record) => (
                    <a
                      key={record.id}
                      href={`/vehicles/${record.vehicleId}`}
                      class="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div class="flex justify-between items-start">
                        <div>
                          <h3 class="font-medium text-gray-900">{record.itemName}</h3>
                          <p class="text-sm text-gray-600">{record.vehicleName}</p>
                        </div>
                        {record.actualCost && (
                          <span class="text-sm font-medium text-green-600">
                            ${record.actualCost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p class="mt-1 text-xs text-gray-500">
                        {new Date(record.maintenanceDate).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <div class="text-center py-8 text-gray-500">
                  <div class="text-4xl mb-2">📋</div>
                  <p>No maintenance records yet</p>
                  <a href="/vehicles" class="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                    Add your first vehicle
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/vehicles"
              class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div class="text-3xl">🚗</div>
              <div>
                <h3 class="font-medium text-gray-900">My Vehicles</h3>
                <p class="text-sm text-gray-600">View and manage your vehicles</p>
              </div>
            </a>
            <a
              href="/maintenance/history"
              class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div class="text-3xl">📜</div>
              <div>
                <h3 class="font-medium text-gray-900">Maintenance History</h3>
                <p class="text-sm text-gray-600">View all service records</p>
              </div>
            </a>
            <a
              href="/analytics"
              class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div class="text-3xl">📊</div>
              <div>
                <h3 class="font-medium text-gray-900">Cost Analytics</h3>
                <p class="text-sm text-gray-600">Track spending and trends</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
});

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export function DashboardOverview() {
  const stats = useSignal({
    vehicles: 0,
    gardenBeds: 0,
    cropBatches: 0,
    expenses: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats from API
    function fetchStats() {
      try {
        // In a real implementation, fetch from your API
        // const response = await fetch('/api/dashboard/stats');
        // const data = await response.json();
        
        // For now, use mock data
        stats.value = {
          vehicles: 3,
          gardenBeds: 6,
          cropBatches: 12,
          expenses: 47,
        };
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Garage</h2>
        <p class="text-3xl font-bold text-primary-600">{stats.value.vehicles}</p>
        <p class="text-gray-600">Vehicles</p>
        <a href="/garage" class="mt-4 inline-block text-primary-600 hover:text-primary-800">
          View Garage →
        </a>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Garden</h2>
        <div class="space-y-2">
          <div>
            <p class="text-3xl font-bold text-green-600">{stats.value.gardenBeds}</p>
            <p class="text-gray-600">Garden Beds</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-green-600">{stats.value.cropBatches}</p>
            <p class="text-gray-600">Active Crops</p>
          </div>
        </div>
        <a href="/garden" class="mt-4 inline-block text-primary-600 hover:text-primary-800">
          View Garden →
        </a>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Finance</h2>
        <p class="text-3xl font-bold text-yellow-600">{stats.value.expenses}</p>
        <p class="text-gray-600">This Month's Expenses</p>
        <a href="/finance" class="mt-4 inline-block text-primary-600 hover:text-primary-800">
          View Finance →
        </a>
      </div>
    </>
  );
}

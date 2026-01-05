import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";

export default define.page(function GarageMaintenancePage() {
  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>Maintenance - Garage - LifeOS</title>
      </Head>

      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🛠️</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Maintenance</h1>
                <p class="text-sm text-gray-500">
                  Log and review maintenance by vehicle
                </p>
              </div>
            </div>
            <a
              href="/garage"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Garage
            </a>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div class="bg-white rounded-xl shadow-md p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-2">
            Where maintenance lives
          </h2>
          <p class="text-gray-600">
            Maintenance is currently tracked per vehicle on the vehicle detail
            page. Open a vehicle to view its maintenance history and log new
            entries.
          </p>
        </div>
      </main>
    </div>
  );
});

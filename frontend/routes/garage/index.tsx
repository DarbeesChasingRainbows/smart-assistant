import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import VehicleList from "../../islands/garage/VehicleList.tsx";

export default define.page(function GaragePage(ctx) {
  const initialShowCreate = ctx.url.searchParams.get("create") === "1";

  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>Garage - LifeOS</title>
      </Head>

      {/* Header */}
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🚗</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Garage</h1>
                <p class="text-sm text-gray-500">
                  Manage your vehicles and components
                </p>
              </div>
            </div>
            <a
              href="/garage?create=1"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Vehicle</span>
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-4">
            <a
              href="/garage"
              class="px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-medium"
            >
              Vehicles
            </a>
            <a
              href="/garage/components"
              class="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Components
            </a>
            <a
              href="/garage/maintenance"
              class="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Maintenance
            </a>
            <a
              href="/garage/pro"
              class="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Pro
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <VehicleList initialShowCreate={initialShowCreate} />
      </main>
    </div>
  );
});

import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import ProfessionalGarageDashboard from "../../islands/garage/ProfessionalGarageDashboard.tsx";

export default define.page(function GarageProPage() {
  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>Garage Pro - LifeOS</title>
      </Head>

      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🧰</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Garage Pro</h1>
                <p class="text-sm text-gray-500">
                  Professional overview, edits, and history corrections
                </p>
              </div>
            </div>
            <a
              href="/garage/vehicles/new"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>Add Vehicle</span>
            </a>
          </div>
        </div>
      </header>

      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-4">
            <a
              href="/garage"
              class="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
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
              class="px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-medium"
            >
              Pro
            </a>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ProfessionalGarageDashboard />
      </main>
    </div>
  );
});

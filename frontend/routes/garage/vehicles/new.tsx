import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import VehicleForm from "../../../islands/garage/VehicleForm.tsx";

export default define.page(function NewVehiclePage() {
  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>Add Vehicle - Garage - LifeOS</title>
      </Head>

      {/* Header */}
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-4">
            <a
              href="/garage"
              class="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Garage
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <VehicleForm />
      </main>
    </div>
  );
});

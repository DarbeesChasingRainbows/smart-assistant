import { Head } from "fresh/runtime";
import { define } from "../../../utils.ts";
import VehicleDetailIsland from "../../../islands/garage/VehicleDetailIsland.tsx";

export default define.page(function VehicleDetailPage(ctx) {
  const vehicleId = ctx.params.id;

  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>Vehicle Details - Garage - LifeOS</title>
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

      {/* Main Content - Vehicle details will be loaded client-side */}
      <main class="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <VehicleDetailIsland vehicleId={vehicleId} />
      </main>
    </div>
  );
});

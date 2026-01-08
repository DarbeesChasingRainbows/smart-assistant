import { define } from "@/utils.ts";
import GardenDashboardIsland from "../../islands/garden/GardenDashboardIsland.tsx";

export default define.page(function GardenCrops() {
  return (
    <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/garden" class="text-slate-500 hover:text-slate-700">← Garden</a>
            <h1 class="text-2xl font-bold text-slate-900">Crops</h1>
          </div>
          <a
            href="/garden/crops/add"
            class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            + Add batch
          </a>
        </div>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-7">
        <GardenDashboardIsland initialTab="batches" />
      </main>
    </div>
  );
});

import GardenDashboardIsland from "../../islands/garden/GardenDashboardIsland.tsx";

export default function GardenPage() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header class="bg-white shadow-sm border-b border-green-200">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/" class="text-gray-500 hover:text-gray-700">← Home</a>
            <span class="text-2xl">🌱</span>
            <h1 class="text-2xl font-bold text-green-800">Garden</h1>
          </div>
        </div>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-8">
        <GardenDashboardIsland />
      </main>
    </div>
  );
}

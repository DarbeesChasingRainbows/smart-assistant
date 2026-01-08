import GardenDashboardIsland from "../../islands/garden/GardenDashboardIsland.tsx";

export default function GardenPage() {
  return (
    <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/" class="text-slate-500 hover:text-slate-700">← Home</a>
            <span class="text-2xl">🌱</span>
            <h1 class="text-2xl font-bold text-slate-900">Garden</h1>
          </div>
          <div class="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <a class="hover:text-slate-700" href="/garden/beds">Beds</a>
            <span class="text-slate-300">/</span>
            <a class="hover:text-slate-700" href="/garden/species">Species</a>
            <span class="text-slate-300">/</span>
            <a class="hover:text-slate-700" href="/garden/crops">Batches</a>
          </div>
        </div>
      </header>
      <main class="max-w-7xl mx-auto px-4 py-7">
        <GardenDashboardIsland />
      </main>
    </div>
  );
}

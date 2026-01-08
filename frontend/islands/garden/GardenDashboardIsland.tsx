import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CropBatchDto,
  type GardenBedDto,
  type SpeciesDto,
} from "../../lib/api.ts";

interface Props {
  initialTab?: "beds" | "species" | "batches";
}

export default function GardenDashboardIsland({ initialTab }: Props) {
  const species = useSignal<SpeciesDto[]>([]);
  const beds = useSignal<GardenBedDto[]>([]);
  const batches = useSignal<CropBatchDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const activeTab = useSignal<"beds" | "species" | "batches">(initialTab ?? "beds");
  const searchQuery = useSignal("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    loading.value = true;
    error.value = null;
    try {
      const [speciesData, bedsData, batchesData] = await Promise.all([
        api.garden.species.getAll(),
        api.garden.beds.getAll(),
        api.garden.batches.getAll(),
      ]);
      species.value = speciesData;
      beds.value = bedsData;
      batches.value = batchesData;
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load garden data";
    } finally {
      loading.value = false;
    }
  }

  async function deleteBed(id: string) {
    if (!confirm("Delete this garden bed?")) return;
    try {
      await api.garden.beds.delete(id);
      await loadData();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete bed";
    }
  }

  async function deleteSpecies(id: string) {
    if (!confirm("Delete this species?")) return;
    try {
      await api.garden.species.delete(id);
      await loadData();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete species";
    }
  }

  async function deleteBatch(id: string) {
    if (!confirm("Delete this crop batch?")) return;
    try {
      await api.garden.batches.delete(id);
      await loadData();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete batch";
    }
  }

  if (loading.value) {
    return (
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  const activeBatches = batches.value.filter((b) =>
    !["Harvested", "Failed", "Terminated"].includes(b.status)
  );
  const activeBeds = beds.value.filter((b) => b.isActive);

  const normalizedQuery = searchQuery.value.trim().toLowerCase();
  const filteredBeds = normalizedQuery
    ? beds.value.filter((b) =>
      `${b.name} ${b.soilType}`.toLowerCase().includes(normalizedQuery)
    )
    : beds.value;

  const filteredSpecies = normalizedQuery
    ? species.value.filter((s) =>
      `${s.name} ${s.scientificName ?? ""} ${s.plantType} ${s.growthHabit}`
        .toLowerCase()
        .includes(normalizedQuery)
    )
    : species.value;

  const filteredBatches = normalizedQuery
    ? batches.value.filter((b) =>
      `${b.batchName} ${b.status} ${b.unit}`.toLowerCase().includes(
        normalizedQuery,
      )
    )
    : batches.value;

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error.value}
        </div>
      )}

      {/* Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Active Beds</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-green-700">{activeBeds.length}</div>
            <div class="text-2xl">🛏️</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Species</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-emerald-700">{species.value.length}</div>
            <div class="text-2xl">🌱</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Active Batches</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-lime-700">{activeBatches.length}</div>
            <div class="text-2xl">📦</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Fruiting</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-teal-700">
              {batches.value.filter((b) => b.status === "Fruiting").length}
            </div>
            <div class="text-2xl">🍅</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-2">
            <div class="text-slate-800 font-semibold">Garden</div>
            <div class="text-xs text-slate-500">Quick management</div>
          </div>
          <div class="w-full md:w-80">
            <input
              type="text"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/30"
              placeholder="Search beds, species, batches…"
              value={searchQuery.value}
              onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 border-b border-slate-200">
          <div class="flex flex-wrap gap-2">
            {(["beds", "species", "batches"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => activeTab.value = tab}
                class={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  activeTab.value === tab
                    ? "bg-green-50 text-green-800 border-green-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span class="mr-2">
                  {tab === "beds" ? "🌿" : tab === "species" ? "🌱" : "📦"}
                </span>
                {tab === "beds"
                  ? "Beds"
                  : tab === "species"
                  ? "Species"
                  : "Batches"}
                <span class="ml-2 text-xs opacity-70">
                  {tab === "beds"
                    ? beds.value.length
                    : tab === "species"
                    ? species.value.length
                    : batches.value.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div class="p-4">
          {activeTab.value === "beds" && (
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-slate-600">
                  {filteredBeds.length} bed{filteredBeds.length !== 1 ? "s" : ""}
                </div>
                <a
                  href="/garden/beds/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 inline-flex items-center gap-2"
                >
                  <span>+</span>
                  Add bed
                </a>
              </div>
              {filteredBeds.length === 0
                ? (
                  <div class="text-center py-10">
                    <div class="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                      🌿
                    </div>
                    <div class="mt-4 font-medium text-slate-700">No beds yet</div>
                    <div class="text-sm text-slate-500 mt-1">Create your first bed to start planning plantings.</div>
                  </div>
                )
                : (
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBeds.map((bed) => (
                      <div
                        key={bed.id}
                        class={`border rounded-2xl p-4 transition-colors ${
                          bed.isActive
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div class="flex justify-between items-start">
                          <div>
                            <h3 class="font-semibold text-slate-900">
                              {bed.name}
                            </h3>
                            <p class="text-sm text-slate-600">
                              {bed.area} sq ft • {bed.soilType}
                            </p>
                            <p class="text-xs text-slate-500">
                              {bed.hasIrrigation
                                ? "💧 Irrigated"
                                : "No irrigation"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteBed(bed.id)}
                            class="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeTab.value === "species" && (
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-slate-600">
                  {filteredSpecies.length} species
                </div>
                <a
                  href="/garden/species/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 inline-flex items-center gap-2"
                >
                  <span>+</span>
                  Add species
                </a>
              </div>
              {filteredSpecies.length === 0
                ? (
                  <div class="text-center py-10">
                    <div class="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                      🌱
                    </div>
                    <div class="mt-4 font-medium text-slate-700">No species yet</div>
                    <div class="text-sm text-slate-500 mt-1">Add your first plant species to build your catalog.</div>
                  </div>
                )
                : (
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSpecies.map((s) => (
                      <div
                        key={s.id}
                        class={`border rounded-2xl p-4 transition-colors ${
                          s.medicinalData
                            ? "border-purple-200 bg-purple-50"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div class="flex justify-between items-start">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <h3 class="font-semibold text-slate-900">
                                {s.name}
                              </h3>
                              {s.medicinalData && (
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  🌿 Medicinal
                                </span>
                              )}
                            </div>
                            <p class="text-sm text-slate-600">
                              {s.plantType} • {s.growthHabit}
                            </p>
                            {s.scientificName && (
                              <p class="text-xs text-slate-500 italic">
                                {s.scientificName}
                              </p>
                            )}
                            {s.daysToMaturity && (
                              <p class="text-xs text-slate-500">
                                {s.daysToMaturity} days to maturity
                              </p>
                            )}
                            {s.medicinalData && (
                              <div class="mt-2 text-xs text-purple-700">
                                <p>• Safety Class: {s.medicinalData.safetyClass}</p>
                                {s.medicinalData.partsUsed.length > 0 && (
                                  <p>• Parts Used: {s.medicinalData.partsUsed.join(", ")}</p>
                                )}
                                {s.medicinalData.primaryIndications.length > 0 && (
                                  <p>• Primary Use: {s.medicinalData.primaryIndications[0]}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteSpecies(s.id)}
                            class="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-sm ml-2"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeTab.value === "batches" && (
            <div class="space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-slate-600">
                  {filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""}
                </div>
                <a
                  href="/garden/crops/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 inline-flex items-center gap-2"
                >
                  <span>+</span>
                  Add batch
                </a>
              </div>
              {filteredBatches.length === 0
                ? (
                  <div class="text-center py-10">
                    <div class="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                      📦
                    </div>
                    <div class="mt-4 font-medium text-slate-700">No batches yet</div>
                    <div class="text-sm text-slate-500 mt-1">Add a crop batch to track quantities and status.</div>
                  </div>
                )
                : (
                  <div class="space-y-3">
                    {filteredBatches.map((batch) => (
                      <div
                        key={batch.id}
                        class="border border-slate-200 bg-white rounded-2xl p-4 flex justify-between items-center"
                      >
                        <div>
                          <h3 class="font-semibold text-slate-900">
                            {batch.batchName}
                          </h3>
                          <p class="text-sm text-slate-600">
                            {batch.quantity} {batch.unit} • Status:{" "}
                            <span
                              class={`font-medium ${
                                batch.status === "Harvested"
                                  ? "text-green-600"
                                  : batch.status === "Failed"
                                  ? "text-red-600"
                                  : batch.status === "Fruiting"
                                  ? "text-amber-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {batch.status}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteBatch(batch.id)}
                          class="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

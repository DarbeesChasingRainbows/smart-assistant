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

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {/* Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-green-600">
            {activeBeds.length}
          </div>
          <div class="text-sm text-gray-500">Active Beds</div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-emerald-600">
            {species.value.length}
          </div>
          <div class="text-sm text-gray-500">Species</div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-lime-600">
            {activeBatches.length}
          </div>
          <div class="text-sm text-gray-500">Active Batches</div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-4 text-center">
          <div class="text-3xl font-bold text-teal-600">
            {batches.value.filter((b) => b.status === "Fruiting").length}
          </div>
          <div class="text-sm text-gray-500">Ready to Harvest</div>
        </div>
      </div>

      {/* Tabs */}
      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="flex border-b">
          {(["beds", "species", "batches"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => activeTab.value = tab}
              class={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab.value === tab
                  ? "bg-green-50 text-green-700 border-b-2 border-green-500"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab === "beds"
                ? "🌿 Garden Beds"
                : tab === "species"
                ? "🌱 Species"
                : "📦 Crop Batches"}
            </button>
          ))}
        </div>

        <div class="p-4">
          {activeTab.value === "beds" && (
            <div class="space-y-4">
              <div class="flex justify-end">
                <a
                  href="/garden/beds/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-block"
                >
                  + Add Bed
                </a>
              </div>
              {beds.value.length === 0
                ? (
                  <p class="text-gray-500 text-center py-8">
                    No garden beds yet
                  </p>
                )
                : (
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {beds.value.map((bed) => (
                      <div
                        key={bed.id}
                        class={`border rounded-lg p-4 ${
                          bed.isActive
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div class="flex justify-between items-start">
                          <div>
                            <h3 class="font-semibold text-gray-900">
                              {bed.name}
                            </h3>
                            <p class="text-sm text-gray-500">
                              {bed.area} sq ft • {bed.soilType}
                            </p>
                            <p class="text-xs text-gray-400">
                              {bed.hasIrrigation
                                ? "💧 Irrigated"
                                : "No irrigation"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteBed(bed.id)}
                            class="text-red-500 hover:text-red-700 text-sm"
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
              <div class="flex justify-end">
                <a
                  href="/garden/species/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-block"
                >
                  + Add Species
                </a>
              </div>
              {species.value.length === 0
                ? (
                  <p class="text-gray-500 text-center py-8">
                    No species cataloged yet
                  </p>
                )
                : (
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {species.value.map((s) => (
                      <div
                        key={s.id}
                        class={`border rounded-lg p-4 ${
                          s.medicinalData
                            ? "border-purple-200 bg-purple-50"
                            : "border-emerald-200 bg-emerald-50"
                        }`}
                      >
                        <div class="flex justify-between items-start">
                          <div class="flex-1">
                            <div class="flex items-center gap-2">
                              <h3 class="font-semibold text-gray-900">
                                {s.name}
                              </h3>
                              {s.medicinalData && (
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  🌿 Medicinal
                                </span>
                              )}
                            </div>
                            <p class="text-sm text-gray-500">
                              {s.plantType} • {s.growthHabit}
                            </p>
                            {s.scientificName && (
                              <p class="text-xs text-gray-400 italic">
                                {s.scientificName}
                              </p>
                            )}
                            {s.daysToMaturity && (
                              <p class="text-xs text-gray-400">
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
                            class="text-red-500 hover:text-red-700 text-sm ml-2"
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
              <div class="flex justify-end">
                <a
                  href="/garden/crops/add"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-block"
                >
                  + Add Batch
                </a>
              </div>
              {batches.value.length === 0
                ? (
                  <p class="text-gray-500 text-center py-8">
                    No crop batches yet
                  </p>
                )
                : (
                  <div class="space-y-3">
                    {batches.value.map((batch) => (
                      <div
                        key={batch.id}
                        class="border rounded-lg p-4 flex justify-between items-center"
                      >
                        <div>
                          <h3 class="font-semibold text-gray-900">
                            {batch.batchName}
                          </h3>
                          <p class="text-sm text-gray-500">
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
                          class="text-red-500 hover:text-red-700 text-sm"
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

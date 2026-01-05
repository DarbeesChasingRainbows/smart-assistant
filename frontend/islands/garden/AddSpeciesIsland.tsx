import { useSignal } from "@preact/signals";
import {
  api,
  type CreateSpeciesRequest,
  type MedicinalPropertiesDto,
} from "../../lib/api.ts";
import { firstError } from "../../lib/forms.ts";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";
import MedicinalDataForm from "../../components/forms/MedicinalDataForm.tsx";

export default function AddSpeciesIsland() {
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);
  
  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  // Form fields
  const name = useSignal("");
  const scientificName = useSignal("");
  const variety = useSignal("");
  const plantType = useSignal("Vegetable");
  const growthHabit = useSignal("Erect");
  const sunRequirement = useSignal("FullSun");
  const waterNeed = useSignal("Moderate");
  const soilType = useSignal("Loamy");
  const daysToMaturity = useSignal<number | null>(null);
  const spacing = useSignal<number | null>(null);
  const depth = useSignal<number | null>(null);
  const germination = useSignal<number | null>(null);
  const frostTolerance = useSignal(false);
  const plantingSeasons = useSignal<string[]>(["Spring", "Summer"]);
  const harvestSeasons = useSignal<string[]>(["Summer", "Fall"]);
  const notes = useSignal("");
  const medicinalData = useSignal<MedicinalPropertiesDto | null>(null);
  const formTab = useSignal<"basic" | "medicinal">("basic");

  function clearMessages() {
    error.value = null;
    success.value = null;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving.value = true;
    clearMessages();
    fieldErrors.value = {};
    formErrors.value = [];

    if (!name.value.trim()) {
      fieldErrors.value = { name: ["Name is required"] };
      saving.value = false;
      return;
    }

    try {
      const req: CreateSpeciesRequest = {
        name: name.value.trim(),
        scientificName: scientificName.value.trim() || null,
        variety: variety.value.trim() || null,
        plantType: plantType.value,
        growthHabit: growthHabit.value,
        sunRequirement: sunRequirement.value,
        waterNeed: waterNeed.value,
        preferredSoilType: soilType.value,
        daysToMaturity: daysToMaturity.value ?? null,
        spacingRequirement: spacing.value ?? null,
        depthRequirement: depth.value ?? null,
        germinationRate: germination.value ?? null,
        frostTolerance: frostTolerance.value,
        plantingSeasons: plantingSeasons.value,
        harvestSeasons: harvestSeasons.value,
        medicinalData: medicinalData.value,
        notes: notes.value.trim() || null,
      };
      
      await api.garden.species.create(req);
      success.value = "Species created successfully!";
      
      // Reset form
      name.value = "";
      scientificName.value = "";
      variety.value = "";
      plantType.value = "Vegetable";
      growthHabit.value = "Erect";
      sunRequirement.value = "FullSun";
      waterNeed.value = "Moderate";
      soilType.value = "Loamy";
      daysToMaturity.value = null;
      spacing.value = null;
      depth.value = null;
      germination.value = null;
      frostTolerance.value = false;
      plantingSeasons.value = ["Spring", "Summer"];
      harvestSeasons.value = ["Summer", "Fall"];
      notes.value = "";
      medicinalData.value = null;
      formTab.value = "basic";
      fieldErrors.value = {};
      formErrors.value = [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create species";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Add Plant Species</h1>
          <p class="text-gray-600 mt-2">
            Add comprehensive species details including medicinal properties
          </p>
        </div>
        <a
          href="/garden/species"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back to Species
        </a>
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}
      
      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success.value}
          <a href="/garden/species" class="ml-4 underline">View all species</a>
        </div>
      )}

      <form onSubmit={handleSubmit} class="bg-white rounded-xl shadow-md p-6 space-y-6">
        <FormErrorSummary errors={formErrors.value} />

        {/* Tabs */}
        <div class="flex border-b">
          <button
            type="button"
            onClick={() => formTab.value = "basic"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "basic"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => formTab.value = "medicinal"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "medicinal"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Medicinal Properties
          </button>
        </div>

        {/* Basic Info Tab */}
        {formTab.value === "basic" && (
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Name *"
                error={firstError(fieldErrors.value, "name")}
              >
                <input
                  type="text"
                  class={firstError(fieldErrors.value, "name")
                    ? "w-full px-3 py-2 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    : "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"}
                  value={name.value}
                  onInput={(e) =>
                    name.value = (e.target as HTMLInputElement).value}
                  placeholder="e.g. Tomato"
                  required
                />
              </FormField>

              <FormField
                label="Scientific Name"
                error={firstError(fieldErrors.value, "scientificName")}
              >
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={scientificName.value}
                  onInput={(e) =>
                    scientificName.value = (e.target as HTMLInputElement).value}
                  placeholder="e.g. Solanum lycopersicum"
                />
              </FormField>
            </div>

            <FormField
              label="Variety"
              error={firstError(fieldErrors.value, "variety")}
            >
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                value={variety.value}
                onInput={(e) =>
                  variety.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. Roma, Cherry, Beefsteak"
              />
            </FormField>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                label="Plant Type"
                error={firstError(fieldErrors.value, "plantType")}
              >
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={plantType.value}
                  onChange={(e) =>
                    plantType.value = (e.target as HTMLSelectElement).value}
                >
                  <option>Vegetable</option>
                  <option>Fruit</option>
                  <option>Herb</option>
                  <option>Flower</option>
                  <option>Grain</option>
                  <option>Tree</option>
                  <option>Shrub</option>
                  <option>Grass</option>
                </select>
              </FormField>

              <FormField
                label="Growth Habit"
                error={firstError(fieldErrors.value, "growthHabit")}
              >
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={growthHabit.value}
                  onChange={(e) =>
                    growthHabit.value = (e.target as HTMLSelectElement).value}
                >
                  <option>Erect</option>
                  <option>Vining</option>
                  <option>Bushy</option>
                  <option>Trailing</option>
                  <option>Climbing</option>
                  <option>Spreading</option>
                </select>
              </FormField>

              <FormField
                label="Sun Requirement"
                error={firstError(fieldErrors.value, "sunRequirement")}
              >
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={sunRequirement.value}
                  onChange={(e) =>
                    sunRequirement.value = (e.target as HTMLSelectElement).value}
                >
                  <option>FullSun</option>
                  <option>PartialSun</option>
                  <option>PartialShade</option>
                  <option>FullShade</option>
                </select>
              </FormField>

              <FormField
                label="Water Need"
                error={firstError(fieldErrors.value, "waterNeed")}
              >
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={waterNeed.value}
                  onChange={(e) =>
                    waterNeed.value = (e.target as HTMLSelectElement).value}
                >
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                </select>
              </FormField>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                label="Days to Maturity"
                error={firstError(fieldErrors.value, "daysToMaturity")}
              >
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={daysToMaturity.value ?? ""}
                  onInput={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    daysToMaturity.value = raw ? Number.parseInt(raw, 10) : null;
                  }}
                  placeholder="days"
                />
              </FormField>

              <FormField
                label="Spacing (sq ft)"
                error={firstError(fieldErrors.value, "spacingRequirement")}
              >
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={spacing.value ?? ""}
                  onInput={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    spacing.value = raw ? Number.parseInt(raw, 10) : null;
                  }}
                  placeholder="sq ft"
                />
              </FormField>

              <FormField
                label="Planting Depth (in)"
                error={firstError(fieldErrors.value, "depthRequirement")}
              >
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={depth.value ?? ""}
                  onInput={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    depth.value = raw ? Number.parseInt(raw, 10) : null;
                  }}
                  placeholder="inches"
                />
              </FormField>

              <FormField
                label="Germination Rate (%)"
                error={firstError(fieldErrors.value, "germinationRate")}
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  value={germination.value ?? ""}
                  onInput={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    germination.value = raw ? Number.parseInt(raw, 10) : null;
                  }}
                  placeholder="%"
                />
              </FormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Planting Seasons"
                error={firstError(fieldErrors.value, "plantingSeasons")}
              >
                <div class="space-y-2">
                  {["Spring", "Summer", "Fall", "Winter"].map((season) => (
                    <label key={season} class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={plantingSeasons.value.includes(season)}
                        onChange={(e) => {
                          if ((e.target as HTMLInputElement).checked) {
                            plantingSeasons.value = [...plantingSeasons.value, season];
                          } else {
                            plantingSeasons.value = plantingSeasons.value.filter(s => s !== season);
                          }
                        }}
                      />
                      <span class="text-sm">{season}</span>
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField
                label="Harvest Seasons"
                error={firstError(fieldErrors.value, "harvestSeasons")}
              >
                <div class="space-y-2">
                  {["Spring", "Summer", "Fall", "Winter"].map((season) => (
                    <label key={season} class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={harvestSeasons.value.includes(season)}
                        onChange={(e) => {
                          if ((e.target as HTMLInputElement).checked) {
                            harvestSeasons.value = [...harvestSeasons.value, season];
                          } else {
                            harvestSeasons.value = harvestSeasons.value.filter(s => s !== season);
                          }
                        }}
                      />
                      <span class="text-sm">{season}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="frost-tolerance"
                checked={frostTolerance.value}
                onChange={(e) =>
                  frostTolerance.value = (e.target as HTMLInputElement).checked}
              />
              <label for="frost-tolerance" class="text-sm text-gray-700">
                Frost Tolerant
              </label>
            </div>

            <FormField
              label="Notes"
              error={firstError(fieldErrors.value, "notes")}
            >
              <textarea
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                value={notes.value}
                onInput={(e) =>
                  notes.value = (e.target as HTMLTextAreaElement).value}
                placeholder="Any additional notes about this species..."
                rows={3}
              />
            </FormField>
          </div>
        )}

        {/* Medicinal Properties Tab */}
        {formTab.value === "medicinal" && (
          <MedicinalDataForm
            medicinalData={medicinalData.value}
            onChange={(data) => medicinalData.value = data}
            disabled={saving.value}
          />
        )}

        <div class="flex justify-end gap-3 pt-6 border-t">
          <a
            href="/garden/species"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={saving.value}
          >
            {saving.value ? "Saving..." : "Create Species"}
          </button>
        </div>
      </form>
    </div>
  );
}

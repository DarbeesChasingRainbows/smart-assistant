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

  const formTab = useSignal<
    "identity" | "horticulture" | "medicinal" | "sources" | "review"
  >("identity");

  const commonNames = useSignal<string[]>([]);
  const commonNameInput = useSignal("");
  const taxonomyFamily = useSignal("");
  const synonyms = useSignal<string[]>([]);
  const synonymInput = useSignal("");
  const monographSummary = useSignal("");
  const sources = useSignal<string[]>([]);
  const sourceInput = useSignal("");

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
      const monographText = buildMonographNotes();
      const combinedNotes = [notes.value.trim(), monographText.trim()]
        .filter(Boolean)
        .join("\n\n");

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
        notes: combinedNotes.trim() || null,
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
      formTab.value = "identity";
      commonNames.value = [];
      commonNameInput.value = "";
      taxonomyFamily.value = "";
      synonyms.value = [];
      synonymInput.value = "";
      monographSummary.value = "";
      sources.value = [];
      sourceInput.value = "";
      fieldErrors.value = {};
      formErrors.value = [];
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create species";
    } finally {
      saving.value = false;
    }
  }

  function addStringToList(list: typeof commonNames, input: typeof commonNameInput) {
    const v = input.value.trim();
    if (!v) return;
    list.value = Array.from(new Set([...list.value, v]));
    input.value = "";
  }

  function removeStringFromList(list: typeof commonNames, idx: number) {
    list.value = list.value.filter((_, i) => i !== idx);
  }

  function buildMonographNotes(): string {
    const blocks: string[] = [];

    const header = [
      "## Monograph",
      `**Common names:** ${commonNames.value.length ? commonNames.value.join(", ") : "-"}`,
      `**Scientific name:** ${scientificName.value.trim() || "-"}`,
      `**Family:** ${taxonomyFamily.value.trim() || "-"}`,
      `**Plant type:** ${plantType.value}`,
      `**Growth habit:** ${growthHabit.value}`,
    ].join("\n");
    blocks.push(header);

    if (synonyms.value.length > 0) {
      blocks.push(`**Synonyms:** ${synonyms.value.join(", ")}`);
    }

    if (monographSummary.value.trim()) {
      blocks.push("\n### Summary\n" + monographSummary.value.trim());
    }

    const horticultureLines = [
      "\n### Horticulture",
      `**Sun:** ${sunRequirement.value}`,
      `**Water:** ${waterNeed.value}`,
      `**Preferred soil:** ${soilType.value}`,
      `**Days to maturity:** ${daysToMaturity.value ?? "-"}`,
      `**Spacing:** ${spacing.value ?? "-"}`,
      `**Depth:** ${depth.value ?? "-"}`,
      `**Germination rate:** ${germination.value ?? "-"}`,
      `**Frost tolerance:** ${frostTolerance.value ? "Yes" : "No"}`,
      `**Planting seasons:** ${plantingSeasons.value.join(", ")}`,
      `**Harvest seasons:** ${harvestSeasons.value.join(", ")}`,
    ].join("\n");
    blocks.push(horticultureLines);

    if (sources.value.length > 0) {
      blocks.push("\n### Sources\n" + sources.value.map((s) => `- ${s}`).join("\n"));
    }

    return blocks.join("\n").trim();
  }

  return (
    <div class="min-h-screen bg-linear-to-br from-emerald-50 via-white to-green-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/garden/species" class="text-slate-500 hover:text-slate-700">← Species</a>
            <span class="text-2xl">🌿</span>
            <div>
              <h1 class="text-2xl font-bold text-slate-900">New Species Monograph</h1>
              <p class="text-sm text-slate-500">Herbal + horticulture profile (PDR-style)</p>
            </div>
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            onClick={() => {
              notes.value = "";
              monographSummary.value = "";
              sources.value = [];
              sourceInput.value = "";
            }}
            disabled={saving.value}
          >
            Clear notes
          </button>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-7 space-y-6">

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
            onClick={() => formTab.value = "identity"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "identity"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Identity
          </button>
          <button
            type="button"
            onClick={() => formTab.value = "horticulture"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "horticulture"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Horticulture
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
          <button
            type="button"
            onClick={() => formTab.value = "sources"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "sources"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Sources & Notes
          </button>
          <button
            type="button"
            onClick={() => formTab.value = "review"}
            class={`px-4 py-2 font-medium text-sm border-b-2 ${
              formTab.value === "review"
                ? "border-green-500 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Review
          </button>
        </div>

        {/* Basic Info Tab */}
        {formTab.value === "identity" && (
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
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
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

        {formTab.value === "horticulture" && (
          <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Sun" error={null}>
                <select
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={sunRequirement.value}
                  onChange={(e) =>
                    sunRequirement.value = (e.target as HTMLSelectElement).value}
                >
                  <option>FullSun</option>
                  <option>PartialShade</option>
                  <option>FullShade</option>
                </select>
              </FormField>

              <FormField label="Water" error={null}>
                <select
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={waterNeed.value}
                  onChange={(e) =>
                    waterNeed.value = (e.target as HTMLSelectElement).value}
                >
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                </select>
              </FormField>

              <FormField label="Soil" error={null}>
                <select
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={soilType.value}
                  onChange={(e) =>
                    soilType.value = (e.target as HTMLSelectElement).value}
                >
                  <option>Sandy</option>
                  <option>Clay</option>
                  <option>Loamy</option>
                  <option>Silt</option>
                  <option>Peaty</option>
                  <option>Chalky</option>
                </select>
              </FormField>

              <FormField label="Frost" error={null}>
                <label class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white">
                  <input
                    type="checkbox"
                    checked={frostTolerance.value}
                    onChange={(e) =>
                      frostTolerance.value = (e.target as HTMLInputElement).checked}
                  />
                  <span class="text-sm text-slate-700">Tolerant</span>
                </label>
              </FormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Days to maturity" error={null}>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={daysToMaturity.value ?? ""}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    daysToMaturity.value = v ? Number.parseInt(v, 10) : null;
                  }}
                  placeholder="e.g. 60"
                />
              </FormField>

              <FormField label="Germination rate (%)" error={null}>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={germination.value ?? ""}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    germination.value = v ? Number.parseInt(v, 10) : null;
                  }}
                  placeholder="e.g. 85"
                />
              </FormField>

              <FormField label="Spacing requirement" error={null}>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={spacing.value ?? ""}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    spacing.value = v ? Number.parseInt(v, 10) : null;
                  }}
                  placeholder="(units vary)"
                />
              </FormField>

              <FormField label="Depth requirement" error={null}>
                <input
                  type="number"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={depth.value ?? ""}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    depth.value = v ? Number.parseInt(v, 10) : null;
                  }}
                  placeholder="(units vary)"
                />
              </FormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Planting seasons" error={null}>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={plantingSeasons.value.join(", ")}
                  onInput={(e) => {
                    plantingSeasons.value = (e.target as HTMLInputElement).value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }}
                  placeholder="Spring, Summer"
                />
              </FormField>

              <FormField label="Harvest seasons" error={null}>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={harvestSeasons.value.join(", ")}
                  onInput={(e) => {
                    harvestSeasons.value = (e.target as HTMLInputElement).value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }}
                  placeholder="Summer, Fall"
                />
              </FormField>
            </div>
          </div>
        )}

        {formTab.value === "medicinal" && (
          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-sm font-medium text-slate-800">PDR-style sections</div>
              <div class="text-sm text-slate-600 mt-1">
                Fill safety class, parts used, indications, contraindications, preparations, dosage, interactions.
              </div>
            </div>
            <MedicinalDataForm
              medicinalData={medicinalData.value}
              onChange={(d) => medicinalData.value = d}
              disabled={saving.value}
            />
          </div>
        )}

        {formTab.value === "sources" && (
          <div class="space-y-4">
            <FormField label="Monograph summary" error={null}>
              <textarea
                class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent min-h-28"
                value={monographSummary.value}
                onInput={(e) =>
                  monographSummary.value = (e.target as HTMLTextAreaElement).value}
                placeholder="Short summary in a monograph style (traditional use, key actions, cultivation notes)."
              />
            </FormField>

            <div class="space-y-2">
              <div class="text-sm font-medium text-slate-700">Sources</div>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent"
                  value={sourceInput.value}
                  onInput={(e) =>
                    sourceInput.value = (e.target as HTMLInputElement).value}
                  placeholder="e.g. PDR for Herbal Medicines, Commission E, local notes"
                />
                <button
                  type="button"
                  class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                  onClick={() => addStringToList(sources, sourceInput)}
                >
                  Add
                </button>
              </div>
              {sources.value.length > 0 && (
                <div class="flex flex-wrap gap-2">
                  {sources.value.map((s, i) => (
                    <span
                      key={`${s}-${i}`}
                      class="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm"
                    >
                      {s}
                      <button
                        type="button"
                        class="text-slate-500 hover:text-slate-900"
                        onClick={() => removeStringFromList(sources, i)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <FormField label="Additional notes" error={null}>
              <textarea
                class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/30 focus:border-transparent min-h-36"
                value={notes.value}
                onInput={(e) => notes.value = (e.target as HTMLTextAreaElement).value}
                placeholder="Freeform notes (will be stored alongside the structured monograph)."
              />
            </FormField>
          </div>
        )}

        {formTab.value === "review" && (
          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-sm font-semibold text-slate-800">What will be saved</div>
              <div class="text-sm text-slate-600 mt-1">
                This app currently stores extra monograph sections inside the species notes field.
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="bg-white rounded-2xl border border-slate-200 p-4">
                <div class="text-sm font-semibold text-slate-800">Core fields</div>
                <div class="mt-3 space-y-2 text-sm text-slate-700">
                  <div><span class="text-slate-500">Name:</span> {name.value || "-"}</div>
                  <div><span class="text-slate-500">Scientific:</span> {scientificName.value || "-"}</div>
                  <div><span class="text-slate-500">Plant type:</span> {plantType.value}</div>
                  <div><span class="text-slate-500">Sun:</span> {sunRequirement.value}</div>
                  <div><span class="text-slate-500">Water:</span> {waterNeed.value}</div>
                </div>
              </div>

              <div class="bg-white rounded-2xl border border-slate-200 p-4">
                <div class="text-sm font-semibold text-slate-800">Notes preview</div>
                <pre class="mt-3 text-xs whitespace-pre-wrap text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-72 overflow-auto">
{[notes.value.trim(), buildMonographNotes().trim()].filter(Boolean).join("\n\n")}
                </pre>
              </div>
            </div>
          </div>
        )}
        <div class="flex justify-end gap-3 pt-2">
          <a
            href="/garden/species"
            class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            disabled={saving.value}
          >
            {saving.value ? "Saving..." : "Create species"}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}

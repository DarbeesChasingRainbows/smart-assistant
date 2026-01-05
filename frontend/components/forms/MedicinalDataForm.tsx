import { useSignal } from "@preact/signals";
import { type MedicinalPropertiesDto } from "../../lib/api.ts";

// Type helper for preparation handling
type Preparation = MedicinalPropertiesDto["preparations"][0];
type OtherPreparation = Extract<Preparation, { Other: string }>;
type StandardPreparation = Exclude<Preparation, { Other: string }>;

const STANDARD_PREPARATIONS: StandardPreparation[] = [
  "Infusion",
  "Decoction",
  "Tincture",
  "Capsule",
  "Tablet",
  "Oil",
  "Salve",
  "Compress",
  "Syrup",
  "Oxymel"
];

function isStandardPreparation(prep: string | Preparation): prep is StandardPreparation {
  return typeof prep === 'string' && STANDARD_PREPARATIONS.includes(prep as StandardPreparation);
}

function isOtherPreparation(prep: Preparation): prep is OtherPreparation {
  return typeof prep === 'object' && 'Other' in prep;
}

interface Props {
  medicinalData: MedicinalPropertiesDto | null;
  onChange: (data: MedicinalPropertiesDto | null) => void;
  disabled?: boolean;
}

export default function MedicinalDataForm({ medicinalData, onChange, disabled = false }: Props) {
  const isEnabled = useSignal(medicinalData !== null);

  const actions = useSignal(medicinalData?.actions || []);
  const constituents = useSignal(medicinalData?.constituents || []);
  const primaryIndications = useSignal(medicinalData?.primaryIndications || []);
  const partsUsed = useSignal(medicinalData?.partsUsed || []);
  const contraindications = useSignal(medicinalData?.contraindications || []);
  const precautions = useSignal(medicinalData?.precautions || []);
  const adverseEffects = useSignal(medicinalData?.adverseEffects || []);
  const overdosage = useSignal(medicinalData?.overdosage || "");
  const drugInteractions = useSignal(medicinalData?.drugInteractions || []);
  const safetyClass = useSignal(medicinalData?.safetyClass || "Unknown");
  const standardDosage = useSignal(medicinalData?.standardDosage || "");
  const preparations = useSignal<Preparation[]>(medicinalData?.preparations || []);

  function updateMedicinalData() {
    if (!isEnabled.value) {
      onChange(null);
      return;
    }

    const data: MedicinalPropertiesDto = {
      actions: actions.value,
      constituents: constituents.value,
      primaryIndications: primaryIndications.value,
      partsUsed: partsUsed.value,
      contraindications: contraindications.value,
      precautions: precautions.value,
      adverseEffects: adverseEffects.value,
      overdosage: overdosage.value || null,
      drugInteractions: drugInteractions.value,
      safetyClass: safetyClass.value as MedicinalPropertiesDto["safetyClass"],
      standardDosage: standardDosage.value || null,
      preparations: preparations.value, // Already typed correctly
    };
    onChange(data);
  }

  function addToList(listSignal: typeof actions, value: string) {
    if (value.trim()) {
      listSignal.value = [...listSignal.value, value.trim()];
      updateMedicinalData();
    }
  }

  function removeFromList(listSignal: typeof actions, index: number) {
    listSignal.value = listSignal.value.filter((_, i) => i !== index);
    updateMedicinalData();
  }

  return (
    <div class="space-y-6">
      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          id="medicinal-enabled"
          checked={isEnabled.value}
          onChange={(e) => {
            isEnabled.value = (e.target as HTMLInputElement).checked;
            updateMedicinalData();
          }}
          disabled={disabled}
        />
        <label for="medicinal-enabled" class="text-sm font-medium text-gray-700">
          This species has medicinal properties
        </label>
      </div>

      {isEnabled.value && (
        <>
          {/* Safety Class */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Safety Class
            </label>
            <select
              value={safetyClass.value}
              onChange={(e) => {
                safetyClass.value = (e.target as HTMLSelectElement).value as MedicinalPropertiesDto["safetyClass"];
                updateMedicinalData();
              }}
              disabled={disabled}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="Class1">Class 1 - Safe when used appropriately</option>
              <option value="Class2a">Class 2a - External use only</option>
              <option value="Class2b">Class 2b - Not for use in pregnancy</option>
              <option value="Class2c">Class 2c - Not for use while nursing</option>
              <option value="Class2d">Class 2d - Other specific restrictions</option>
              <option value="Class3">Class 3 - Use only under supervision</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          {/* Parts Used */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Parts Used
            </label>
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Leaf, Root, Flower"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToList(partsUsed, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="e.g. Leaf, Root, Flower"]') as HTMLInputElement;
                  addToList(partsUsed, input.value);
                  input.value = "";
                }}
                disabled={disabled}
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              {partsUsed.value.map((part, index) => (
                <span
                  key={index}
                  class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {part}
                  <button
                    type="button"
                    onClick={() => removeFromList(partsUsed, index)}
                    disabled={disabled}
                    class="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Primary Indications */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Primary Indications
            </label>
            <div class="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Anxiety, Inflammation"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToList(primaryIndications, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="e.g. Anxiety, Inflammation"]') as HTMLInputElement;
                  addToList(primaryIndications, input.value);
                  input.value = "";
                }}
                disabled={disabled}
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              {primaryIndications.value.map((indication, index) => (
                <span
                  key={index}
                  class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {indication}
                  <button
                    type="button"
                    onClick={() => removeFromList(primaryIndications, index)}
                    disabled={disabled}
                    class="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preparations */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Preparations
            </label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["Infusion", "Decoction", "Tincture", "Capsule", "Tablet", "Oil", "Salve", "Compress", "Syrup", "Oxymel"].map((prep) => (
                <label key={prep} class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preparations.value.some(p => isStandardPreparation(p) ? p === prep : isOtherPreparation(p) && p.Other === prep)}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        preparations.value = [...preparations.value, prep as StandardPreparation];
                      } else {
                        preparations.value = preparations.value.filter(p => 
                          isStandardPreparation(p) ? p !== prep : !(isOtherPreparation(p) && p.Other === prep)
                        );
                      }
                      updateMedicinalData();
                    }}
                    disabled={disabled}
                  />
                  <span class="text-sm">{prep}</span>
                </label>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other preparation type"
              class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value && !preparations.value.some(p => isOtherPreparation(p) && p.Other === value)) {
                    preparations.value = [...preparations.value, { Other: value }];
                    updateMedicinalData();
                  }
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              disabled={disabled}
            />
          </div>

          {/* Standard Dosage */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Standard Dosage (optional)
            </label>
            <input
              type="text"
              value={standardDosage.value}
              onChange={(e) => {
                standardDosage.value = (e.target as HTMLInputElement).value;
                updateMedicinalData();
              }}
              placeholder="e.g. 1-2 cups daily"
              disabled={disabled}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Contraindications */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Contraindications
            </label>
            <textarea
              value={contraindications.value.join('\n')}
              onChange={(e) => {
                contraindications.value = (e.target as HTMLTextAreaElement).value.split('\n').filter(s => s.trim());
                updateMedicinalData();
              }}
              placeholder="One per line"
              disabled={disabled}
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Precautions */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Precautions
            </label>
            <textarea
              value={precautions.value.join('\n')}
              onChange={(e) => {
                precautions.value = (e.target as HTMLTextAreaElement).value.split('\n').filter(s => s.trim());
                updateMedicinalData();
              }}
              placeholder="One per line"
              disabled={disabled}
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Adverse Effects */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Adverse Effects
            </label>
            <textarea
              value={adverseEffects.value.join('\n')}
              onChange={(e) => {
                adverseEffects.value = (e.target as HTMLTextAreaElement).value.split('\n').filter(s => s.trim());
                updateMedicinalData();
              }}
              placeholder="One per line"
              disabled={disabled}
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Drug Interactions */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Drug Interactions
            </label>
            <textarea
              value={drugInteractions.value.join('\n')}
              onChange={(e) => {
                drugInteractions.value = (e.target as HTMLTextAreaElement).value.split('\n').filter(s => s.trim());
                updateMedicinalData();
              }}
              placeholder="One per line"
              disabled={disabled}
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Overdosage */}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Overdosage Symptoms
            </label>
            <textarea
              value={overdosage.value || ""}
              onChange={(e) => {
                overdosage.value = (e.target as HTMLTextAreaElement).value;
                updateMedicinalData();
              }}
              placeholder="Symptoms of overdosage"
              disabled={disabled}
              rows={3}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </>
      )}
    </div>
  );
}

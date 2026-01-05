import { useState } from "preact/hooks";
import { JSX } from "preact";

interface CropBatchFormProps {
  onSubmit: (data: CropBatchData) => void;
  initialData?: Partial<CropBatchData>;
  availableSpecies: string[];
}

export interface CropBatchData {
  speciesName: string;
  batchId: string;
  quantity: number;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  location: string;
  growingMethod: "container" | "ground" | "raised_bed" | "greenhouse" | "hydroponic";
  soilType: string;
  phLevel: number;
  fertilizerUsed: string;
  wateringSchedule: string;
  sunlightHours: number;
  temperatureRange: {
    min: number;
    max: number;
  };
  humidity: number;
  pestsObserved: string[];
  diseasesObserved: string[];
  yieldActual?: number;
  yieldExpected: number;
  qualityRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  status: "planted" | "growing" | "harvested" | "failed";
}

const GROWING_METHODS = ["container", "ground", "raised_bed", "greenhouse", "hydroponic"];
const STATUS_OPTIONS = ["planted", "growing", "harvested", "failed"];

export default function CropBatchForm({ onSubmit, initialData, availableSpecies }: CropBatchFormProps) {
  const [formData, setFormData] = useState<CropBatchData>({
    speciesName: initialData?.speciesName || "",
    batchId: initialData?.batchId || `BATCH-${Date.now()}`,
    quantity: initialData?.quantity || 1,
    plantingDate: initialData?.plantingDate || new Date().toISOString().split('T')[0],
    expectedHarvestDate: initialData?.expectedHarvestDate || "",
    actualHarvestDate: initialData?.actualHarvestDate || "",
    location: initialData?.location || "",
    growingMethod: initialData?.growingMethod || "ground",
    soilType: initialData?.soilType || "",
    phLevel: initialData?.phLevel || 7.0,
    fertilizerUsed: initialData?.fertilizerUsed || "",
    wateringSchedule: initialData?.wateringSchedule || "",
    sunlightHours: initialData?.sunlightHours || 6,
    temperatureRange: initialData?.temperatureRange || { min: 18, max: 25 },
    humidity: initialData?.humidity || 60,
    pestsObserved: initialData?.pestsObserved || [],
    diseasesObserved: initialData?.diseasesObserved || [],
    yieldActual: initialData?.yieldActual || undefined,
    yieldExpected: initialData?.yieldExpected || 1,
    qualityRating: initialData?.qualityRating || 3,
    notes: initialData?.notes || "",
    status: initialData?.status || "planted",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CropBatchData, string>>>({});
  const [pestInput, setPestInput] = useState("");
  const [diseaseInput, setDiseaseInput] = useState("");

  const handleInputChange = (field: keyof CropBatchData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleArrayAdd = (field: "pestsObserved" | "diseasesObserved", value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const handleArrayRemove = (field: "pestsObserved" | "diseasesObserved", index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CropBatchData, string>> = {};

    if (!formData.speciesName) newErrors.speciesName = "Species is required";
    if (!formData.batchId.trim()) newErrors.batchId = "Batch ID is required";
    if (formData.quantity <= 0) newErrors.quantity = "Quantity must be positive";
    if (!formData.plantingDate) newErrors.plantingDate = "Planting date is required";
    if (!formData.expectedHarvestDate) newErrors.expectedHarvestDate = "Expected harvest date is required";
    if (formData.phLevel < 0 || formData.phLevel > 14) newErrors.phLevel = "pH must be between 0 and 14";
    if (formData.sunlightHours < 0 || formData.sunlightHours > 24) newErrors.sunlightHours = "Sunlight hours must be 0-24";
    if (formData.humidity < 0 || formData.humidity > 100) newErrors.humidity = "Humidity must be 0-100%";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Species *</label>
          <select
            value={formData.speciesName}
            onChange={(e) => handleInputChange("speciesName", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.speciesName ? 'border-red-500' : 'border-gray-300'}`}
            required
          >
            <option value="">Select species...</option>
            {availableSpecies.map(species => (
              <option key={species} value={species}>{species}</option>
            ))}
          </select>
          {errors.speciesName && <p class="text-red-500 text-xs mt-1">{errors.speciesName}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Batch ID *</label>
          <input
            type="text"
            value={formData.batchId}
            onChange={(e) => handleInputChange("batchId", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.batchId ? 'border-red-500' : 'border-gray-300'}`}
            required
            readOnly
          />
          {errors.batchId && <p class="text-red-500 text-xs mt-1">{errors.batchId}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.quantity && <p class="text-red-500 text-xs mt-1">{errors.quantity}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange("status", e.currentTarget.value as CropBatchData["status"])}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Planting Date *</label>
          <input
            type="date"
            value={formData.plantingDate}
            onChange={(e) => handleInputChange("plantingDate", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.plantingDate ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.plantingDate && <p class="text-red-500 text-xs mt-1">{errors.plantingDate}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Expected Harvest Date *</label>
          <input
            type="date"
            value={formData.expectedHarvestDate}
            onChange={(e) => handleInputChange("expectedHarvestDate", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.expectedHarvestDate ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.expectedHarvestDate && <p class="text-red-500 text-xs mt-1">{errors.expectedHarvestDate}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Actual Harvest Date</label>
          <input
            type="date"
            value={formData.actualHarvestDate}
            onChange={(e) => handleInputChange("actualHarvestDate", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Garden bed, container, etc."
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Growing Method</label>
          <select
            value={formData.growingMethod}
            onChange={(e) => handleInputChange("growingMethod", e.currentTarget.value as CropBatchData["growingMethod"])}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {GROWING_METHODS.map(method => (
              <option key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Soil Type</label>
          <input
            type="text"
            value={formData.soilType}
            onChange={(e) => handleInputChange("soilType", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Loamy, sandy, clay, etc."
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">pH Level *</label>
          <input
            type="number"
            min="0"
            max="14"
            step="0.1"
            value={formData.phLevel}
            onChange={(e) => handleInputChange("phLevel", parseFloat(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.phLevel ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.phLevel && <p class="text-red-500 text-xs mt-1">{errors.phLevel}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sunlight Hours *</label>
          <input
            type="number"
            min="0"
            max="24"
            value={formData.sunlightHours}
            onChange={(e) => handleInputChange("sunlightHours", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.sunlightHours ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.sunlightHours && <p class="text-red-500 text-xs mt-1">{errors.sunlightHours}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.humidity}
            onChange={(e) => handleInputChange("humidity", parseInt(e.currentTarget.value))}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Temperature Range (°C)</label>
          <div class="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={formData.temperatureRange.min}
              onChange={(e) => handleInputChange("temperatureRange", { ...formData.temperatureRange, min: parseInt(e.currentTarget.value) })}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Max"
              value={formData.temperatureRange.max}
              onChange={(e) => handleInputChange("temperatureRange", { ...formData.temperatureRange, max: parseInt(e.currentTarget.value) })}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Yield</label>
          <div class="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              placeholder="Expected"
              value={formData.yieldExpected}
              onChange={(e) => handleInputChange("yieldExpected", parseFloat(e.currentTarget.value))}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              min="0"
              placeholder="Actual"
              value={formData.yieldActual || ""}
              onChange={(e) => handleInputChange("yieldActual", e.currentTarget.value ? parseFloat(e.currentTarget.value) : undefined)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Quality Rating</label>
        <select
          value={formData.qualityRating}
          onChange={(e) => handleInputChange("qualityRating", parseInt(e.currentTarget.value) as CropBatchData["qualityRating"])}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={1}>1 - Poor</option>
          <option value={2}>2 - Fair</option>
          <option value={3}>3 - Good</option>
          <option value={4}>4 - Very Good</option>
          <option value={5}>5 - Excellent</option>
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fertilizer Used</label>
          <input
            type="text"
            value={formData.fertilizerUsed}
            onChange={(e) => handleInputChange("fertilizerUsed", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Watering Schedule</label>
          <input
            type="text"
            value={formData.wateringSchedule}
            onChange={(e) => handleInputChange("wateringSchedule", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Daily, weekly, etc."
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Pests Observed</label>
          <div class="flex gap-2 mb-2">
            <input
              type="text"
              value={pestInput}
              onChange={(e) => setPestInput(e.currentTarget.value)}
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add pest..."
            />
            <button
              type="button"
              onClick={() => {
                handleArrayAdd("pestsObserved", pestInput);
                setPestInput("");
              }}
              class="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            {formData.pestsObserved.map((pest, index) => (
              <span key={index} class="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm">
                {pest}
                <button
                  type="button"
                  onClick={() => handleArrayRemove("pestsObserved", index)}
                  class="ml-1 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Diseases Observed</label>
          <div class="flex gap-2 mb-2">
            <input
              type="text"
              value={diseaseInput}
              onChange={(e) => setDiseaseInput(e.currentTarget.value)}
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add disease..."
            />
            <button
              type="button"
              onClick={() => {
                handleArrayAdd("diseasesObserved", diseaseInput);
                setDiseaseInput("");
              }}
              class="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            {formData.diseasesObserved.map((disease, index) => (
              <span key={index} class="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                {disease}
                <button
                  type="button"
                  onClick={() => handleArrayRemove("diseasesObserved", index)}
                  class="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.currentTarget.value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Additional observations and notes..."
        />
      </div>

      <button
        type="submit"
        class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Add Crop Batch
      </button>
    </form>
  );
}

import { useState } from "preact/hooks";
import { JSX } from "preact";

interface SensorDataFormProps {
  onSubmit: (data: SensorData) => void;
  initialData?: Partial<SensorData>;
}

export interface SensorData {
  sensorId: string;
  sensorType: "temperature" | "humidity" | "soil_moisture" | "ph" | "light" | "co2" | "pressure" | "motion" | "other";
  location: string;
  value: number;
  unit: string;
  timestamp: string;
  batteryLevel: number;
  signalStrength: number;
  calibrationDate: string;
  notes: string;
  alertThreshold: {
    min: number;
    max: number;
  };
  isActive: boolean;
}

const SENSOR_TYPES = ["temperature", "humidity", "soil_moisture", "ph", "light", "co2", "pressure", "motion", "other"];

export default function SensorDataForm({ onSubmit, initialData }: SensorDataFormProps) {
  const [formData, setFormData] = useState<SensorData>({
    sensorId: initialData?.sensorId || `SENSOR-${Date.now()}`,
    sensorType: initialData?.sensorType || "temperature",
    location: initialData?.location || "",
    value: initialData?.value || 0,
    unit: initialData?.unit || "",
    timestamp: initialData?.timestamp || new Date().toISOString(),
    batteryLevel: initialData?.batteryLevel || 100,
    signalStrength: initialData?.signalStrength || 100,
    calibrationDate: initialData?.calibrationDate || new Date().toISOString().split('T')[0],
    notes: initialData?.notes || "",
    alertThreshold: initialData?.alertThreshold || { min: 0, max: 100 },
    isActive: initialData?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SensorData, string>>>({});

  const handleInputChange = (field: keyof SensorData, value: string | number | boolean | { min: number; max: number }) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SensorData, string>> = {};

    if (!formData.sensorId.trim()) newErrors.sensorId = "Sensor ID is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (formData.value === undefined || isNaN(formData.value)) newErrors.value = "Value must be a number";
    if (!formData.unit.trim()) newErrors.unit = "Unit is required";
    if (formData.batteryLevel < 0 || formData.batteryLevel > 100) newErrors.batteryLevel = "Battery level must be 0-100";
    if (formData.signalStrength < 0 || formData.signalStrength > 100) newErrors.signalStrength = "Signal strength must be 0-100";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getUnitForType = (type: string): string => {
    const unitMap: Record<string, string> = {
      temperature: "°C",
      humidity: "%",
      soil_moisture: "%",
      ph: "pH",
      light: "lux",
      co2: "ppm",
      pressure: "Pa",
      motion: "boolean",
      other: "unit"
    };
    return unitMap[type] || "unit";
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sensor ID *</label>
          <input
            type="text"
            value={formData.sensorId}
            onChange={(e) => handleInputChange("sensorId", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.sensorId ? 'border-red-500' : 'border-gray-300'}`}
            required
            readOnly
          />
          {errors.sensorId && <p class="text-red-500 text-xs mt-1">{errors.sensorId}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sensor Type *</label>
          <select
            value={formData.sensorType}
            onChange={(e) => {
              const newType = e.currentTarget.value as SensorData["sensorType"];
              handleInputChange("sensorType", newType);
              handleInputChange("unit", getUnitForType(newType));
            }}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {SENSOR_TYPES.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
            required
            placeholder="e.g., Garden Bed A, Greenhouse 1"
          />
          {errors.location && <p class="text-red-500 text-xs mt-1">{errors.location}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => handleInputChange("unit", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.unit ? 'border-red-500' : 'border-gray-300'}`}
            required
            placeholder="e.g., °C, %, lux"
          />
          {errors.unit && <p class="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Value *</label>
          <input
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => handleInputChange("value", parseFloat(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.value ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.value && <p class="text-red-500 text-xs mt-1">{errors.value}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
          <input
            type="datetime-local"
            value={formData.timestamp.replace('Z', '').slice(0, 16)}
            onChange={(e) => handleInputChange("timestamp", new Date(e.currentTarget.value).toISOString())}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Battery Level (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.batteryLevel}
            onChange={(e) => handleInputChange("batteryLevel", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.batteryLevel ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.batteryLevel && <p class="text-red-500 text-xs mt-1">{errors.batteryLevel}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Signal Strength (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.signalStrength}
            onChange={(e) => handleInputChange("signalStrength", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.signalStrength ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.signalStrength && <p class="text-red-500 text-xs mt-1">{errors.signalStrength}</p>}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Alert Threshold</label>
        <div class="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min"
            value={formData.alertThreshold.min}
            onChange={(e) => handleInputChange("alertThreshold", { ...formData.alertThreshold, min: parseFloat(e.currentTarget.value) })}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Max"
            value={formData.alertThreshold.max}
            onChange={(e) => handleInputChange("alertThreshold", { ...formData.alertThreshold, max: parseFloat(e.currentTarget.value) })}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Calibration Date</label>
          <input
            type="date"
            value={formData.calibrationDate}
            onChange={(e) => handleInputChange("calibrationDate", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div class="flex items-center">
          <label class="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange("isActive", e.currentTarget.checked)}
              class="mr-2"
            />
            <span class="text-sm font-medium text-gray-700">Sensor Active</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.currentTarget.value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Additional sensor notes..."
        />
      </div>

      <button
        type="submit"
        class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Record Sensor Data
      </button>
    </form>
  );
}

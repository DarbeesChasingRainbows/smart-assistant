import { useState } from "preact/hooks";
import { JSX } from "preact";

interface PartFormProps {
  onSubmit: (data: PartData) => void;
  initialData?: Partial<PartData>;
}

export interface PartData {
  name: string;
  partNumber: string;
  manufacturer: string;
  category: "engine" | "transmission" | "brakes" | "suspension" | "electrical" | "body" | "interior" | "other";
  description: string;
  cost: number;
  quantity: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  supplierPartNumber: string;
  warrantyMonths: number;
  compatibleVehicles: string[];
  purchaseDate: string;
  expiryDate: string;
  notes: string;
}

const CATEGORIES = ["engine", "transmission", "brakes", "suspension", "electrical", "body", "interior", "other"];

export default function PartForm({ onSubmit, initialData }: PartFormProps) {
  const [formData, setFormData] = useState<PartData>({
    name: initialData?.name || "",
    partNumber: initialData?.partNumber || "",
    manufacturer: initialData?.manufacturer || "",
    category: initialData?.category || "other",
    description: initialData?.description || "",
    cost: initialData?.cost || 0,
    quantity: initialData?.quantity || 1,
    minStock: initialData?.minStock || 1,
    maxStock: initialData?.maxStock || 10,
    supplier: initialData?.supplier || "",
    supplierPartNumber: initialData?.supplierPartNumber || "",
    warrantyMonths: initialData?.warrantyMonths || 12,
    compatibleVehicles: initialData?.compatibleVehicles || [],
    purchaseDate: initialData?.purchaseDate || new Date().toISOString().split('T')[0],
    expiryDate: initialData?.expiryDate || "",
    notes: initialData?.notes || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PartData, string>>>({});

  const handleInputChange = (field: keyof PartData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleArrayInput = (field: "compatibleVehicles", value: string) => {
    const vehicles = value.split(',').map(v => v.trim()).filter(v => v);
    handleInputChange(field, vehicles);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PartData, string>> = {};

    if (!formData.name.trim()) newErrors.name = "Part name is required";
    if (!formData.partNumber.trim()) newErrors.partNumber = "Part number is required";
    if (formData.cost < 0) newErrors.cost = "Cost must be positive";
    if (formData.quantity < 0) newErrors.quantity = "Quantity must be positive";
    if (formData.minStock < 0) newErrors.minStock = "Min stock must be positive";
    if (formData.maxStock < formData.minStock) newErrors.maxStock = "Max stock must be greater than min stock";

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
          <label class="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.name && <p class="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
          <input
            type="text"
            value={formData.partNumber}
            onChange={(e) => handleInputChange("partNumber", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.partNumber ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.partNumber && <p class="text-red-500 text-xs mt-1">{errors.partNumber}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => handleInputChange("manufacturer", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.currentTarget.value as PartData["category"])}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.currentTarget.value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Describe the part..."
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.cost}
            onChange={(e) => handleInputChange("cost", parseFloat(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.cost ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.cost && <p class="text-red-500 text-xs mt-1">{errors.cost}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => handleInputChange("quantity", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.quantity && <p class="text-red-500 text-xs mt-1">{errors.quantity}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Warranty (months)</label>
          <input
            type="number"
            min="0"
            value={formData.warrantyMonths}
            onChange={(e) => handleInputChange("warrantyMonths", parseInt(e.currentTarget.value))}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Min Stock *</label>
          <input
            type="number"
            min="0"
            value={formData.minStock}
            onChange={(e) => handleInputChange("minStock", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.minStock ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.minStock && <p class="text-red-500 text-xs mt-1">{errors.minStock}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Max Stock *</label>
          <input
            type="number"
            min="0"
            value={formData.maxStock}
            onChange={(e) => handleInputChange("maxStock", parseInt(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.maxStock ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.maxStock && <p class="text-red-500 text-xs mt-1">{errors.maxStock}</p>}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <input
            type="text"
            value={formData.supplier}
            onChange={(e) => handleInputChange("supplier", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Supplier Part Number</label>
          <input
            type="text"
            value={formData.supplierPartNumber}
            onChange={(e) => handleInputChange("supplierPartNumber", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleInputChange("purchaseDate", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => handleInputChange("expiryDate", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Compatible Vehicles</label>
        <input
          type="text"
          value={formData.compatibleVehicles.join(', ')}
          onChange={(e) => handleArrayInput("compatibleVehicles", e.currentTarget.value)}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Comma-separated list of compatible vehicles"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.currentTarget.value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Additional notes..."
        />
      </div>

      <button
        type="submit"
        class="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        Add Part
      </button>
    </form>
  );
}

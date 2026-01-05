import { useState } from "preact/hooks";
import { JSX } from "preact";

interface ExpenseFormProps {
  onSubmit: (data: ExpenseData) => void;
  initialData?: Partial<ExpenseData>;
}

export interface ExpenseData {
  title: string;
  amount: number;
  category: "groceries" | "utilities" | "transportation" | "entertainment" | "healthcare" | "education" | "garden" | "garage" | "other";
  subcategory: string;
  description: string;
  date: string;
  paymentMethod: "cash" | "card" | "bank_transfer" | "online" | "other";
  vendor: string;
  receiptNumber: string;
  taxDeductible: boolean;
  budgetCategory: string;
  tags: string[];
  notes: string;
}

const CATEGORIES = ["groceries", "utilities", "transportation", "entertainment", "healthcare", "education", "garden", "garage", "other"];
const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "online", "other"];

export default function ExpenseForm({ onSubmit, initialData }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseData>({
    title: initialData?.title || "",
    amount: initialData?.amount || 0,
    category: initialData?.category || "other",
    subcategory: initialData?.subcategory || "",
    description: initialData?.description || "",
    date: initialData?.date || new Date().toISOString().split('T')[0],
    paymentMethod: initialData?.paymentMethod || "card",
    vendor: initialData?.vendor || "",
    receiptNumber: initialData?.receiptNumber || "",
    taxDeductible: initialData?.taxDeductible || false,
    budgetCategory: initialData?.budgetCategory || "",
    tags: initialData?.tags || [],
    notes: initialData?.notes || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseData, string>>>({});
  const [tagInput, setTagInput] = useState("");

  const handleInputChange = (field: keyof ExpenseData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTagAdd = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag.trim()] }));
      setTagInput("");
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExpenseData, string>> = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (formData.amount <= 0) newErrors.amount = "Amount must be positive";
    if (!formData.date) newErrors.date = "Date is required";

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
          <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.title && <p class="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange("amount", parseFloat(e.currentTarget.value))}
            class={`w-full px-3 py-2 border rounded-md ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.amount && <p class="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.currentTarget.value as ExpenseData["category"])}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
          <input
            type="text"
            value={formData.subcategory}
            onChange={(e) => handleInputChange("subcategory", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., Organic, Seeds"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.currentTarget.value)}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Describe the expense..."
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.currentTarget.value)}
            class={`w-full px-3 py-2 border rounded-md ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
            required
          />
          {errors.date && <p class="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => handleInputChange("paymentMethod", e.currentTarget.value as ExpenseData["paymentMethod"])}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <input
            type="text"
            value={formData.vendor}
            onChange={(e) => handleInputChange("vendor", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Store or vendor name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
          <input
            type="text"
            value={formData.receiptNumber}
            onChange={(e) => handleInputChange("receiptNumber", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Budget Category</label>
          <input
            type="text"
            value={formData.budgetCategory}
            onChange={(e) => handleInputChange("budgetCategory", e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Monthly budget category"
          />
        </div>

        <div class="flex items-center">
          <label class="flex items-center">
            <input
              type="checkbox"
              checked={formData.taxDeductible}
              onChange={(e) => handleInputChange("taxDeductible", e.currentTarget.checked)}
              class="mr-2"
            />
            <span class="text-sm font-medium text-gray-700">Tax Deductible</span>
          </label>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div class="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.currentTarget.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTagAdd(tagInput);
              }
            }}
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Add tag..."
          />
          <button
            type="button"
            onClick={() => handleTagAdd(tagInput)}
            class="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          {formData.tags.map((tag, index) => (
            <span key={index} class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
              {tag}
              <button
                type="button"
                onClick={() => handleTagRemove(tag)}
                class="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
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
        class="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        Add Expense
      </button>
    </form>
  );
}

import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreateFinancialCategoryRequest,
  type FinancialCategoryDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import {
  createFinancialCategorySchema,
} from "../../lib/financeSchemas.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

type CategoryType = "Income" | "Expense" | "All";
type CategoryKind = "Income" | "Expense";

export default function CategoriesIsland() {
  const categories = useSignal<FinancialCategoryDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const search = useSignal("");
  const typeFilter = useSignal<CategoryType>("All");

  const showCreate = useSignal(false);
  const saving = useSignal(false);

  const name = useSignal("");
  const type = useSignal<CategoryKind>("Expense");
  const parentKey = useSignal("");
  const icon = useSignal("");
  const color = useSignal("#3b82f6");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  const filtered = useComputed(() => {
    const term = search.value.trim().toLowerCase();
    let result = categories.value;

    if (typeFilter.value !== "All") {
      result = result.filter((c) => c.type === typeFilter.value);
    }

    if (term) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.key.toLowerCase().includes(term)
      );
    }

    return result;
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      categories.value = await api.finance.categories.list();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load categories";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    name.value = "";
    type.value = "Expense";
    parentKey.value = "";
    icon.value = "";
    color.value = "#3b82f6";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createFinancialCategorySchema.safeParse({
      name: name.value,
      type: type.value,
      parentKey: parentKey.value.trim() || undefined,
      icon: icon.value.trim() || undefined,
      color: color.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateFinancialCategoryRequest = {
      ...parsed.data,
    };

    try {
      const created = await api.finance.categories.create(req);
      categories.value = [created, ...categories.value].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      showCreate.value = false;
      resetForm();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create category";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            class="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={search.value}
            onInput={(e) => search.value = (e.target as HTMLInputElement).value}
            placeholder="Search by name or key..."
          />
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={typeFilter.value}
            onChange={(e) =>
              typeFilter.value = (e.target as HTMLSelectElement)
                .value as CategoryType}
          >
            <option value="All">All</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={load}
            disabled={loading.value}
          >
            {loading.value ? "Loading..." : "Refresh"}
          </button>
        </div>

        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => {
            showCreate.value = true;
            resetForm();
          }}
        >
          + Add Category
        </button>
      </div>

      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && filtered.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No categories found</p>
          <p class="mt-2">Create categories to power budgets and reporting</p>
        </div>
      )}

      {!loading.value && filtered.value.length > 0 && (
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="divide-y">
            {filtered.value.map((c) => (
              <div
                key={c.key}
                class="px-4 py-3 flex items-start justify-between gap-4"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color ?? "#94a3b8" }}
                    />
                    <div class="font-medium text-gray-900">{c.name}</div>
                    <span
                      class={c.type === "Income"
                        ? "text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                        : "text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"}
                    >
                      {c.type}
                    </span>
                  </div>
                  <div class="text-sm text-gray-500 mt-1">
                    Key: <span class="font-mono">{c.key}</span>
                    {c.parentKey
                      ? (
                        <>
                          {" "}• Parent:{" "}
                          <span class="font-mono">{c.parentKey}</span>
                        </>
                      )
                      : null}
                  </div>
                </div>

                <div class="text-xs text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="New category"
          subtitle="Income or Expense"
          onClose={() => {
            if (saving.value) return;
            showCreate.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showCreate.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitCreate}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={formErrors.value} />

          <FormField label="Name" error={firstError(fieldErrors.value, "name")}>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={name.value}
              onInput={(e) =>
                name.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. Groceries"
            />
          </FormField>

          <FormField label="Type" error={firstError(fieldErrors.value, "type")}>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={type.value}
              onChange={(e) =>
                type.value = (e.target as HTMLSelectElement)
                  .value as CategoryKind}
            >
              <option value="Expense">Expense</option>
              <option value="Income">Income</option>
            </select>
          </FormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Parent key" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={parentKey.value}
                onInput={(e) =>
                  parentKey.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. food"
              />
            </FormField>

            <FormField label="Color" error={null} hint="Optional">
              <input
                type="color"
                class="w-full h-10 border border-gray-300 rounded-lg"
                value={color.value}
                onInput={(e) =>
                  color.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          </div>

          <FormField label="Icon" error={null} hint="Optional">
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={icon.value}
              onInput={(e) =>
                icon.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. 🛒"
            />
          </FormField>
        </FormModal>
      )}
    </div>
  );
}

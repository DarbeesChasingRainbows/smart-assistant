import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateFinancialMerchantRequest,
  type FinancialCategoryDto,
  type FinancialMerchantDto,
  type FinancialTransactionDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const merchantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  defaultCategoryKey: z.string().optional(),
  notes: z.string().optional(),
});

export default function MerchantsIsland() {
  const merchants = useSignal<FinancialMerchantDto[]>([]);
  const categories = useSignal<FinancialCategoryDto[]>([]);
  const transactions = useSignal<FinancialTransactionDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  // Filters
  const search = useSignal("");
  const sortBy = useSignal<"name" | "recent" | "txCount">("name");

  // Create/Edit modal
  const showModal = useSignal(false);
  const editingMerchant = useSignal<FinancialMerchantDto | null>(null);
  const saving = useSignal(false);
  const fieldErrors = useSignal<Record<string, string[]>>({});

  // Form fields
  const formName = useSignal("");
  const formWebsite = useSignal("");
  const formDefaultCategoryKey = useSignal("");
  const formNotes = useSignal("");

  // Merge modal
  const showMerge = useSignal(false);
  const mergeSource = useSignal<FinancialMerchantDto | null>(null);
  const mergeTargetKey = useSignal("");

  // Computed: transaction counts per merchant
  const txCountByMerchant = useComputed(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions.value) {
      if (tx.merchantKey) {
        counts[tx.merchantKey] = (counts[tx.merchantKey] || 0) + 1;
      }
    }
    return counts;
  });

  const filtered = useComputed(() => {
    let result = merchants.value;
    const term = search.value.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          (m.notes && m.notes.toLowerCase().includes(term)),
      );
    }

    // Sort
    if (sortBy.value === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy.value === "recent") {
      result = [...result].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortBy.value === "txCount") {
      result = [...result].sort(
        (a, b) =>
          (txCountByMerchant.value[b.key] || 0) -
          (txCountByMerchant.value[a.key] || 0),
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
      const [merch, cats, txs] = await Promise.all([
        api.finance.merchants.list(),
        api.finance.categories.list(),
        api.finance.transactions.list({ limit: 1000, offset: 0 }),
      ]);
      merchants.value = merch;
      categories.value = cats;
      transactions.value = txs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load merchants";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formName.value = "";
    formWebsite.value = "";
    formDefaultCategoryKey.value = "";
    formNotes.value = "";
    fieldErrors.value = {};
    editingMerchant.value = null;
  }

  function openCreate() {
    resetForm();
    showModal.value = true;
  }

  function openEdit(merchant: FinancialMerchantDto) {
    editingMerchant.value = merchant;
    formName.value = merchant.name;
    formWebsite.value = merchant.website ?? "";
    formDefaultCategoryKey.value = merchant.defaultCategoryKey ?? "";
    formNotes.value = merchant.notes ?? "";
    fieldErrors.value = {};
    showModal.value = true;
  }

  async function submitForm() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};

    const parsed = merchantSchema.safeParse({
      name: formName.value.trim(),
      website: formWebsite.value.trim() || undefined,
      defaultCategoryKey: formDefaultCategoryKey.value || undefined,
      notes: formNotes.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    try {
      if (editingMerchant.value) {
        // Update existing
        const updated = await api.finance.merchants.update(
          editingMerchant.value.key,
          {
            name: parsed.data.name,
            website: parsed.data.website,
            defaultCategoryKey: parsed.data.defaultCategoryKey,
            notes: parsed.data.notes,
          },
        );
        merchants.value = merchants.value.map((m) =>
          m.key === updated.key ? updated : m
        );
        success.value = "Merchant updated";
      } else {
        // Create new
        const req: CreateFinancialMerchantRequest = {
          name: parsed.data.name,
          website: parsed.data.website,
          defaultCategoryKey: parsed.data.defaultCategoryKey,
          notes: parsed.data.notes,
        };
        const created = await api.finance.merchants.create(req);
        merchants.value = [...merchants.value, created];
        success.value = "Merchant created";
      }

      showModal.value = false;
      resetForm();
      setTimeout(() => (success.value = null), 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to save merchant";
    } finally {
      saving.value = false;
    }
  }

  function openMerge(merchant: FinancialMerchantDto) {
    mergeSource.value = merchant;
    mergeTargetKey.value = "";
    showMerge.value = true;
  }

  async function executeMerge() {
    if (!mergeSource.value || !mergeTargetKey.value) return;

    saving.value = true;
    error.value = null;

    try {
      // Update all transactions from source to target merchant
      const sourceTxs = transactions.value.filter(
        (t) => t.merchantKey === mergeSource.value!.key,
      );

      for (const tx of sourceTxs) {
        await api.finance.transactions.update(tx.key, {
          merchantKey: mergeTargetKey.value,
        });
      }

      // Delete the source merchant
      await api.finance.merchants.delete(mergeSource.value.key);

      // Reload data
      await load();

      showMerge.value = false;
      mergeSource.value = null;
      success.value = `Merged ${sourceTxs.length} transactions`;
      setTimeout(() => (success.value = null), 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to merge";
    } finally {
      saving.value = false;
    }
  }

  function categoryName(key: string | null | undefined) {
  if (!key) return null;
  return categories.value.find((c) => c.key === key)?.name ?? key;
}

return (
    <div class="space-y-4">
      {/* Filters */}
      <div class="bg-white border rounded-xl p-4">
        <div class="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            class="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[200px]"
            value={search.value}
            onInput={(
              e,
            ) => (search.value = (e.target as HTMLInputElement).value)}
            placeholder="Search merchants..."
          />
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={sortBy.value}
            onChange={(
              e,
            ) => (sortBy.value = (e.target as HTMLSelectElement).value as
              | "name"
              | "recent"
              | "txCount")}
          >
            <option value="name">Sort by name</option>
            <option value="recent">Sort by recent</option>
            <option value="txCount">Sort by transaction count</option>
          </select>
          <span class="text-sm text-gray-600">
            {filtered.value.length} merchants
          </span>
          <div class="ml-auto flex gap-2">
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
              onClick={load}
              disabled={loading.value}
            >
              {loading.value ? "Loading..." : "Refresh"}
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              onClick={openCreate}
            >
              + Add Merchant
            </button>
          </div>
        </div>
      </div>

      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          {success.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && filtered.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No merchants found</p>
          <p class="mt-2">Add a merchant to speed up transaction entry</p>
        </div>
      )}

      {!loading.value && filtered.value.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.value.map((m) => {
            const txCount = txCountByMerchant.value[m.key] || 0;
            return (
              <div
                key={m.key}
                class="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="font-semibold text-gray-900">{m.name}</div>
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {txCount} tx
                  </span>
                </div>

                {m.website && (
                  <a
                    class="text-sm text-blue-600 hover:underline block truncate"
                    href={m.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {m.website}
                  </a>
                )}

                {m.defaultCategoryKey && (
                  <div class="text-sm text-gray-600 mt-1">
                    Default: {categoryName(m.defaultCategoryKey)}
                  </div>
                )}

                {m.notes && (
                  <div class="text-sm text-gray-400 mt-2 truncate">
                    {m.notes}
                  </div>
                )}

                <div class="mt-3 flex gap-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    onClick={() => openEdit(m)}
                  >
                    Edit
                  </button>
                  {txCount > 0 && (
                    <button
                      type="button"
                      class="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
                      onClick={() => openMerge(m)}
                    >
                      Merge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal.value && (
        <FormModal
          title={editingMerchant.value ? "Edit Merchant" : "New Merchant"}
          subtitle={editingMerchant.value
            ? "Update merchant details"
            : "Add a store/vendor"}
          onClose={() => {
            if (saving.value) return;
            showModal.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showModal.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitForm}
                disabled={saving.value}
              >
                {saving.value
                  ? "Saving..."
                  : editingMerchant.value
                  ? "Update"
                  : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={Object.values(fieldErrors.value).flat()} />

          <div class="space-y-3">
            <FormField label="Name" error={firstError(fieldErrors.value, "name")}>
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formName.value}
                onInput={(e) =>
                  formName.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="Website"
              error={firstError(fieldErrors.value, "website")}
              hint="Optional"
            >
              <input
                type="url"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formWebsite.value}
                onInput={(e) =>
                  formWebsite.value = (e.target as HTMLInputElement).value}
                placeholder="https://example.com"
              />
            </FormField>

            <FormField label="Default Category" error={null} hint="Auto-fill category when selecting this merchant">
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={formDefaultCategoryKey.value}
                onChange={(e) =>
                  formDefaultCategoryKey.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">No default category</option>
                {categories.value.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Notes" error={null} hint="Optional">
              <textarea
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                value={formNotes.value}
                onInput={(e) =>
                  formNotes.value = (e.target as HTMLTextAreaElement).value}
                placeholder="Optional notes"
              />
            </FormField>
          </div>
        </FormModal>
      )}

      {/* Merge Modal */}
      {showMerge.value && mergeSource.value && (
        <FormModal
          title="Merge Merchant"
          subtitle={`Move all transactions from "${mergeSource.value.name}" to another merchant`}
          onClose={() => {
            if (saving.value) return;
            showMerge.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showMerge.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                onClick={executeMerge}
                disabled={saving.value || !mergeTargetKey.value}
              >
                {saving.value ? "Merging..." : "Merge"}
              </button>
            </>
          )}
        >
          <div class="space-y-3">
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              This will move{" "}
              <strong>
                {txCountByMerchant.value[mergeSource.value.key] || 0}{" "}
                transactions
              </strong>{" "}
              to the target merchant and delete "{mergeSource.value.name}".
            </div>

            <FormField label="Merge into" error={null}>
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={mergeTargetKey.value}
                onChange={(e) =>
                  mergeTargetKey.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">Select target merchant</option>
                {merchants.value
                  .filter((m) => m.key !== mergeSource.value!.key)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name} ({txCountByMerchant.value[m.key] || 0} tx)
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}

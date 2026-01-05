import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateFinancialTransactionRequest,
  type FinancialAccountDto,
  type FinancialCategoryDto,
  type FinancialMerchantDto,
  type FinancialTransactionDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const transactionSchema = z.object({
  accountKey: z.string().min(1, "Account is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  postedAt: z.string().min(1, "Date is required"),
  merchantKey: z.string().optional(),
  categoryKey: z.string().optional(),
  memo: z.string().optional(),
  checkNumber: z.string().optional(),
});

export default function TransactionsIsland() {
  const transactions = useSignal<FinancialTransactionDto[]>([]);
  const accounts = useSignal<FinancialAccountDto[]>([]);
  const merchants = useSignal<FinancialMerchantDto[]>([]);
  const categories = useSignal<FinancialCategoryDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  // Filters
  const filterAccountKey = useSignal<string>("");
  const filterCategoryKey = useSignal<string>("");
  const filterSearch = useSignal("");
  const filterDateFrom = useSignal("");
  const filterDateTo = useSignal("");

  // Create/Edit modal
  const showCreate = useSignal(false);
  const editingTx = useSignal<FinancialTransactionDto | null>(null);
  const saving = useSignal(false);
  const fieldErrors = useSignal<Record<string, string[]>>({});

  // Form fields
  const formAccountKey = useSignal("");
  const formDescription = useSignal("");
  const formAmount = useSignal("0");
  const formPostedAt = useSignal(new Date().toISOString().slice(0, 10));
  const formMerchantKey = useSignal("");
  const formCategoryKey = useSignal("");
  const formMemo = useSignal("");
  const formCheckNumber = useSignal("");

  const filteredTransactions = useComputed(() => {
    let result = transactions.value;

    if (filterAccountKey.value) {
      result = result.filter((t) => t.accountKey === filterAccountKey.value);
    }
    if (filterCategoryKey.value) {
      result = result.filter((t) => t.categoryKey === filterCategoryKey.value);
    }
    if (filterSearch.value.trim()) {
      const q = filterSearch.value.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.memo && t.memo.toLowerCase().includes(q)),
      );
    }
    if (filterDateFrom.value) {
      const from = new Date(filterDateFrom.value);
      result = result.filter((t) => new Date(t.postedAt) >= from);
    }
    if (filterDateTo.value) {
      const to = new Date(filterDateTo.value);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.postedAt) <= to);
    }

    return result;
  });

  const totalFiltered = useComputed(() =>
    filteredTransactions.value.reduce((sum, t) => sum + t.amount, 0)
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [txs, accs, merch, cats] = await Promise.all([
        api.finance.transactions.list({ limit: 500, offset: 0 }),
        api.finance.accounts.list(),
        api.finance.merchants.list(),
        api.finance.categories.list(),
      ]);
      transactions.value = txs;
      accounts.value = accs;
      merchants.value = merch;
      categories.value = cats;
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load transactions";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formAccountKey.value = "";
    formDescription.value = "";
    formAmount.value = "0";
    formPostedAt.value = new Date().toISOString().slice(0, 10);
    formMerchantKey.value = "";
    formCategoryKey.value = "";
    formMemo.value = "";
    formCheckNumber.value = "";
    fieldErrors.value = {};
    editingTx.value = null;
  }

  function openCreate() {
    resetForm();
    showCreate.value = true;
  }

  function openEdit(tx: FinancialTransactionDto) {
    editingTx.value = tx;
    formAccountKey.value = tx.accountKey;
    formDescription.value = tx.description;
    formAmount.value = String(tx.amount);
    formPostedAt.value = tx.postedAt.slice(0, 10);
    formMerchantKey.value = tx.merchantKey ?? "";
    formCategoryKey.value = tx.categoryKey ?? "";
    formMemo.value = tx.memo ?? "";
    formCheckNumber.value = tx.checkNumber ?? "";
    fieldErrors.value = {};
    showCreate.value = true;
  }

  async function submitForm() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};

    const parsed = transactionSchema.safeParse({
      accountKey: formAccountKey.value,
      description: formDescription.value.trim(),
      amount: formAmount.value,
      postedAt: formPostedAt.value,
      merchantKey: formMerchantKey.value || undefined,
      categoryKey: formCategoryKey.value || undefined,
      memo: formMemo.value.trim() || undefined,
      checkNumber: formCheckNumber.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    try {
      if (editingTx.value) {
        // Update existing
        const updated = await api.finance.transactions.update(
          editingTx.value.key,
          {
            merchantKey: parsed.data.merchantKey,
            categoryKey: parsed.data.categoryKey,
            amount: parsed.data.amount,
            description: parsed.data.description,
            memo: parsed.data.memo,
            postedAt: new Date(parsed.data.postedAt).toISOString(),
            checkNumber: parsed.data.checkNumber,
          },
        );
        transactions.value = transactions.value.map((t) =>
          t.key === updated.key ? updated : t
        );
        success.value = "Transaction updated";
      } else {
        // Create new
        const req: CreateFinancialTransactionRequest = {
          accountKey: parsed.data.accountKey,
          description: parsed.data.description,
          amount: parsed.data.amount,
          postedAt: new Date(parsed.data.postedAt).toISOString(),
          merchantKey: parsed.data.merchantKey,
          categoryKey: parsed.data.categoryKey,
          memo: parsed.data.memo,
          checkNumber: parsed.data.checkNumber,
        };
        const created = await api.finance.transactions.create(req);
        transactions.value = [created, ...transactions.value];
        success.value = "Transaction created";
      }

      showCreate.value = false;
      resetForm();
      setTimeout(() => (success.value = null), 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to save";
    } finally {
      saving.value = false;
    }
  }

  function merchantName(key: string | null | undefined) {
    if (!key) return null;
    return merchants.value.find((m) => m.key === key)?.name ?? key;
  }

  function categoryName(key: string | null | undefined) {
    if (!key) return null;
    return categories.value.find((c) => c.key === key)?.name ?? key;
  }

  function accountName(key: string) {
    return accounts.value.find((a) => a.key === key)?.name ?? key;
  }

  return (
    <div class="space-y-4">
      {/* Filters */}
      <div class="bg-white border rounded-xl p-4 space-y-3">
        <div class="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search description/memo..."
            class="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[200px]"
            value={filterSearch.value}
            onInput={(
              e,
            ) => (filterSearch.value = (e.target as HTMLInputElement).value)}
          />
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterAccountKey.value}
            onChange={(
              e,
            ) => (filterAccountKey.value =
              (e.target as HTMLSelectElement).value)}
          >
            <option value="">All accounts</option>
            {accounts.value.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterCategoryKey.value}
            onChange={(
              e,
            ) => (filterCategoryKey.value =
              (e.target as HTMLSelectElement).value)}
          >
            <option value="">All categories</option>
            {categories.value.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div class="flex flex-wrap gap-3 items-center">
          <label class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">From:</span>
            <input
              type="date"
              class="px-2 py-1 border border-gray-300 rounded"
              value={filterDateFrom.value}
              onInput={(
                e,
              ) => (filterDateFrom.value =
                (e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">To:</span>
            <input
              type="date"
              class="px-2 py-1 border border-gray-300 rounded"
              value={filterDateTo.value}
              onInput={(
                e,
              ) => (filterDateTo.value = (e.target as HTMLInputElement).value)}
            />
          </label>
          <button
            type="button"
            class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            onClick={() => {
              filterAccountKey.value = "";
              filterCategoryKey.value = "";
              filterSearch.value = "";
              filterDateFrom.value = "";
              filterDateTo.value = "";
            }}
          >
            Clear filters
          </button>
          <div class="ml-auto flex items-center gap-3">
            <span class="text-sm text-gray-600">
              {filteredTransactions.value.length} transactions •{" "}
              <span
                class={totalFiltered.value < 0
                  ? "text-red-600"
                  : "text-green-600"}
              >
                {formatMoney(totalFiltered.value)}
              </span>
            </span>
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
              + Add Transaction
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

      {!loading.value && filteredTransactions.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No transactions found</p>
          <p class="mt-2">
            Try adjusting your filters or add a new transaction
          </p>
        </div>
      )}

      {!loading.value && filteredTransactions.value.length > 0 && (
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="divide-y">
            {filteredTransactions.value.map((t) => (
              <div
                key={t.key}
                class="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => openEdit(t)}
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-900 truncate">
                        {t.description}
                      </span>
                      {t.categoryKey && (
                        <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {categoryName(t.categoryKey)}
                        </span>
                      )}
                    </div>
                    <div class="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span>{new Date(t.postedAt).toLocaleDateString()}</span>
                      <span>{accountName(t.accountKey)}</span>
                      {merchantName(t.merchantKey) && (
                        <span>{merchantName(t.merchantKey)}</span>
                      )}
                      <span
                        class={`px-1.5 py-0.5 rounded text-xs ${
                          t.status === "Posted"
                            ? "bg-green-100 text-green-700"
                            : t.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    {t.memo && (
                      <div class="text-sm text-gray-400 mt-1 truncate">
                        {t.memo}
                      </div>
                    )}
                  </div>
                  <div
                    class={`font-semibold whitespace-nowrap ${
                      t.amount < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatMoney(t.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate.value && (
        <FormModal
          title={editingTx.value ? "Edit Transaction" : "New Transaction"}
          subtitle={editingTx.value
            ? "Update transaction details"
            : "Add income/expense against an account"}
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
                onClick={submitForm}
                disabled={saving.value}
              >
                {saving.value
                  ? "Saving..."
                  : editingTx.value
                  ? "Update"
                  : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={Object.values(fieldErrors.value).flat()} />

          <div class="space-y-3">
            <FormField
              label="Account"
              error={firstError(fieldErrors.value, "accountKey")}
            >
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={formAccountKey.value}
                onChange={(e) =>
                  formAccountKey.value = (e.target as HTMLSelectElement).value}
                disabled={!!editingTx.value}
              >
                <option value="">Select account</option>
                {accounts.value.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Description"
              error={firstError(fieldErrors.value, "description")}
            >
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formDescription.value}
                onInput={(e) =>
                  formDescription.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. Grocery store"
              />
            </FormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Amount"
                error={firstError(fieldErrors.value, "amount")}
                hint="Negative for expenses, positive for income"
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formAmount.value}
                  onInput={(e) =>
                    formAmount.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
              <FormField
                label="Date"
                error={firstError(fieldErrors.value, "postedAt")}
              >
                <input
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formPostedAt.value}
                  onInput={(e) =>
                    formPostedAt.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Merchant" error={null} hint="Optional">
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  value={formMerchantKey.value}
                  onChange={(e) =>
                    formMerchantKey.value = (e.target as HTMLSelectElement).value}
                >
                  <option value="">Select merchant</option>
                  {merchants.value.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" error={null} hint="Optional">
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  value={formCategoryKey.value}
                  onChange={(e) =>
                    formCategoryKey.value = (e.target as HTMLSelectElement).value}
                >
                  <option value="">Select category</option>
                  {categories.value.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Memo" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formMemo.value}
                onInput={(e) =>
                  formMemo.value = (e.target as HTMLInputElement).value}
                placeholder="Optional notes"
              />
            </FormField>

            <FormField label="Check Number" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={formCheckNumber.value}
                onInput={(e) =>
                  formCheckNumber.value = (e.target as HTMLInputElement).value}
                placeholder="Optional"
              />
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

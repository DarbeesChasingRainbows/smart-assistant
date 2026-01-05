import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type FinancialMerchantDto,
  type FinancialReceiptDto,
  type FinancialTransactionDto,
  type ReceiptUploadUrlResponse,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const receiptMetaSchema = z.object({
  transactionKey: z.string().optional(),
  merchantKey: z.string().optional(),
  receiptDate: z.string().optional(),
  totalAmount: z.coerce.number().optional(),
  taxAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export default function ReceiptsIsland() {
  const receipts = useSignal<FinancialReceiptDto[]>([]);
  const transactions = useSignal<FinancialTransactionDto[]>([]);
  const merchants = useSignal<FinancialMerchantDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  // Filters
  const filterSearch = useSignal("");
  const filterMerchantKey = useSignal("");
  const filterHasTransaction = useSignal<"" | "yes" | "no">("");
  const filterDateFrom = useSignal("");
  const filterDateTo = useSignal("");

  // Upload
  const uploading = useSignal(false);
  const uploadProgress = useSignal<string | null>(null);

  // Edit modal
  const showEdit = useSignal(false);
  const editingReceipt = useSignal<FinancialReceiptDto | null>(null);
  const saving = useSignal(false);
  const fieldErrors = useSignal<Record<string, string[]>>({});

  // Form fields
  const formTransactionKey = useSignal("");
  const formMerchantKey = useSignal("");
  const formReceiptDate = useSignal("");
  const formTotalAmount = useSignal("");
  const formTaxAmount = useSignal("");
  const formNotes = useSignal("");

  const filteredReceipts = useComputed(() => {
    let result = receipts.value;

    if (filterSearch.value.trim()) {
      const q = filterSearch.value.toLowerCase();
      result = result.filter(
        (r) =>
          r.fileName.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)),
      );
    }
    if (filterMerchantKey.value) {
      result = result.filter((r) => r.merchantKey === filterMerchantKey.value);
    }
    if (filterHasTransaction.value === "yes") {
      result = result.filter((r) => r.transactionKey);
    } else if (filterHasTransaction.value === "no") {
      result = result.filter((r) => !r.transactionKey);
    }
    if (filterDateFrom.value) {
      const from = new Date(filterDateFrom.value);
      result = result.filter((r) => new Date(r.uploadedAt) >= from);
    }
    if (filterDateTo.value) {
      const to = new Date(filterDateTo.value);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.uploadedAt) <= to);
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
      const [rcpts, txs, merch] = await Promise.all([
        api.finance.receipts.list({ limit: 200 }),
        api.finance.transactions.list({ limit: 500, offset: 0 }),
        api.finance.merchants.list(),
      ]);
      receipts.value = rcpts;
      transactions.value = txs;
      merchants.value = merch;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load receipts";
    } finally {
      loading.value = false;
    }
  }

  async function uploadFile(file: File) {
    uploading.value = true;
    uploadProgress.value = "Requesting upload URL...";
    error.value = null;

    try {
      const uploadInfo: ReceiptUploadUrlResponse = await api.finance.receipts
        .getUploadUrl({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
        });

      uploadProgress.value = "Uploading to storage...";

      const putRes = await fetch(uploadInfo.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      uploadProgress.value = "Upload complete. Refreshing list...";
      await load();
      uploadProgress.value = null;
      success.value = "Receipt uploaded";
      setTimeout(() => (success.value = null), 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Upload failed";
      uploadProgress.value = null;
    } finally {
      uploading.value = false;
    }
  }

  function openEdit(receipt: FinancialReceiptDto) {
    editingReceipt.value = receipt;
    formTransactionKey.value = receipt.transactionKey ?? "";
    formMerchantKey.value = receipt.merchantKey ?? "";
    formReceiptDate.value = receipt.receiptDate?.slice(0, 10) ?? "";
    formTotalAmount.value = receipt.totalAmount?.toString() ?? "";
    formTaxAmount.value = receipt.taxAmount?.toString() ?? "";
    formNotes.value = receipt.notes ?? "";
    fieldErrors.value = {};
    showEdit.value = true;
  }

  async function submitEdit() {
    if (!editingReceipt.value) return;

    saving.value = true;
    error.value = null;
    fieldErrors.value = {};

    const parsed = receiptMetaSchema.safeParse({
      transactionKey: formTransactionKey.value || undefined,
      merchantKey: formMerchantKey.value || undefined,
      receiptDate: formReceiptDate.value || undefined,
      totalAmount: formTotalAmount.value || undefined,
      taxAmount: formTaxAmount.value || undefined,
      notes: formNotes.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    try {
      const updated = await api.finance.receipts.update(
        editingReceipt.value.key,
        {
          transactionKey: parsed.data.transactionKey,
          merchantKey: parsed.data.merchantKey,
          receiptDate: parsed.data.receiptDate
            ? new Date(parsed.data.receiptDate).toISOString()
            : undefined,
          totalAmount: parsed.data.totalAmount,
          taxAmount: parsed.data.taxAmount,
          notes: parsed.data.notes,
        },
      );
      receipts.value = receipts.value.map((r) =>
        r.key === updated.key ? updated : r
      );
      showEdit.value = false;
      editingReceipt.value = null;
      success.value = "Receipt updated";
      setTimeout(() => (success.value = null), 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update";
    } finally {
      saving.value = false;
    }
  }

  function merchantName(key: string | null | undefined) {
    if (!key) return null;
    return merchants.value.find((m) => m.key === key)?.name ?? key;
  }

  function transactionDesc(key: string | null | undefined) {
    if (!key) return null;
    const tx = transactions.value.find((t) => t.key === key);
    return tx ? `${tx.description} (${formatMoney(tx.amount)})` : key;
  }

  return (
    <div class="space-y-4">
      {/* Filters */}
      <div class="bg-white border rounded-xl p-4 space-y-3">
        <div class="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search filename/notes..."
            class="px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[200px]"
            value={filterSearch.value}
            onInput={(
              e,
            ) => (filterSearch.value = (e.target as HTMLInputElement).value)}
          />
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterMerchantKey.value}
            onChange={(
              e,
            ) => (filterMerchantKey.value =
              (e.target as HTMLSelectElement).value)}
          >
            <option value="">All merchants</option>
            {merchants.value.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterHasTransaction.value}
            onChange={(
              e,
            ) => (filterHasTransaction.value = (e.target as HTMLSelectElement)
              .value as "" | "yes" | "no")}
          >
            <option value="">All receipts</option>
            <option value="yes">Linked to transaction</option>
            <option value="no">Not linked</option>
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
              filterSearch.value = "";
              filterMerchantKey.value = "";
              filterHasTransaction.value = "";
              filterDateFrom.value = "";
              filterDateTo.value = "";
            }}
          >
            Clear filters
          </button>
          <div class="ml-auto flex items-center gap-3">
            <span class="text-sm text-gray-600">
              {filteredReceipts.value.length} receipts
            </span>
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
              onClick={load}
              disabled={loading.value}
            >
              {loading.value ? "Loading..." : "Refresh"}
            </button>
            <label class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm">
              {uploading.value ? "Uploading..." : "+ Upload"}
              <input
                type="file"
                class="hidden"
                accept="image/*,application/pdf"
                disabled={uploading.value}
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  const f = input.files?.[0];
                  if (f) uploadFile(f);
                  input.value = "";
                }}
              />
            </label>
          </div>
        </div>
        {uploadProgress.value && (
          <div class="text-sm text-blue-600">{uploadProgress.value}</div>
        )}
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

      {!loading.value && filteredReceipts.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No receipts found</p>
          <p class="mt-2">Upload a receipt or adjust your filters</p>
        </div>
      )}

      {!loading.value && filteredReceipts.value.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.value.map((r) => (
            <div
              key={r.key}
              class="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEdit(r)}
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 truncate">
                    {r.fileName}
                  </div>
                  <div class="text-sm text-gray-500">
                    {new Date(r.uploadedAt).toLocaleDateString()} •{" "}
                    {formatBytes(r.fileSize)}
                  </div>
                </div>
                <span
                  class={`px-2 py-0.5 rounded text-xs ${
                    r.transactionKey
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {r.transactionKey ? "Linked" : "Unlinked"}
                </span>
              </div>

              {r.totalAmount != null && (
                <div class="text-lg font-semibold text-gray-900 mb-1">
                  {formatMoney(r.totalAmount)}
                </div>
              )}

              {merchantName(r.merchantKey) && (
                <div class="text-sm text-gray-600 truncate">
                  {merchantName(r.merchantKey)}
                </div>
              )}

              {r.transactionKey && (
                <div class="text-xs text-blue-600 truncate mt-1">
                  {transactionDesc(r.transactionKey)}
                </div>
              )}

              {r.notes && (
                <div class="text-sm text-gray-400 truncate mt-1">{r.notes}</div>
              )}

              <div class="mt-3 flex gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const dl = await api.finance.receipts.downloadUrl(r.key);
                      globalThis.open?.(dl.downloadUrl, "_blank");
                    } catch (err) {
                      error.value = err instanceof Error
                        ? err.message
                        : "Failed to get download URL";
                    }
                  }}
                >
                  View
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(r);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit.value && editingReceipt.value && (
        <FormModal
          title="Edit Receipt"
          subtitle={editingReceipt.value.fileName}
          onClose={() => {
            if (saving.value) return;
            showEdit.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showEdit.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitEdit}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Save"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={Object.values(fieldErrors.value).flat()} />

          <div class="space-y-3">
            <FormField label="Link to Transaction" error={null} hint="Optional">
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={formTransactionKey.value}
                onChange={(e) =>
                  formTransactionKey.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">Not linked</option>
                {transactions.value.slice(0, 100).map((t) => (
                  <option key={t.key} value={t.key}>
                    {new Date(t.postedAt).toLocaleDateString()} -{" "}
                    {t.description} ({formatMoney(t.amount)})
                  </option>
                ))}
              </select>
            </FormField>

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

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                label="Receipt Date"
                error={firstError(fieldErrors.value, "receiptDate")}
                hint="Optional"
              >
                <input
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formReceiptDate.value}
                  onInput={(e) =>
                    formReceiptDate.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
              <FormField
                label="Total Amount"
                error={firstError(fieldErrors.value, "totalAmount")}
                hint="Optional"
              >
                <input
                  type="number"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formTotalAmount.value}
                  onInput={(e) =>
                    formTotalAmount.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
              <FormField
                label="Tax Amount"
                error={firstError(fieldErrors.value, "taxAmount")}
                hint="Optional"
              >
                <input
                  type="number"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formTaxAmount.value}
                  onInput={(e) =>
                    formTaxAmount.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
            </div>

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
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

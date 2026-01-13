import { useSignal } from "@preact/signals";
import type {
  Account,
  Receipt,
  ReceiptItem,
  Transaction,
} from "../types/api.ts";

interface Props {
  initialReceipts: Receipt[];
  unmatchedTransactions: Transaction[];
  accounts: Account[];
  linkTransactionId?: string | null;
}

interface TaxRow {
  taxName: string;
  taxRate: string;
  taxAmount: string;
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

export default function ReceiptsManager(
  { initialReceipts, unmatchedTransactions, accounts, linkTransactionId }:
    Props,
) {
  const receipts = useSignal<Receipt[]>(initialReceipts);
  const isModalOpen = useSignal(false);
  const isUploadModalOpen = useSignal(!!linkTransactionId); // Auto-open if linking from transaction
  const isSubmitting = useSignal(false);
  const selectedReceipt = useSignal<Receipt | null>(null);
  const viewMode = useSignal<"list" | "detail">("list");

  // Upload form state
  const uploadFile = useSignal<File | null>(null);
  const uploadTransactionId = useSignal<string>(linkTransactionId || "");
  const uploadReceiptDate = useSignal(new Date().toISOString().split("T")[0]);
  const uploadPreview = useSignal<string | null>(null);

  // Edit mode state
  const isEditing = useSignal(false);
  const editStoreName = useSignal("");
  const editReceiptDate = useSignal("");
  const editTotal = useSignal("");

  // Filter state
  const filterStoreName = useSignal("");
  const filterLinked = useSignal<string>("all"); // "all", "linked", "unlinked"

  // Form state for new receipt
  const formStoreName = useSignal("");
  const formStoreNumber = useSignal("");
  const formStoreAddress = useSignal("");
  const formStoreCity = useSignal("");
  const formStoreState = useSignal("");
  const formStoreZip = useSignal("");
  const formReceiptDate = useSignal(new Date().toISOString().split("T")[0]);
  const formReceiptNumber = useSignal("");
  const formSubtotal = useSignal("");
  const formTotal = useSignal("");
  const formPaymentAccountId = useSignal<string>(""); // Link to account
  const formTransactionId = useSignal<string>("");

  // Receipt items
  const formItems = useSignal<Partial<ReceiptItem>[]>([]);

  // Tax rows (itemized)
  const formTaxes = useSignal<TaxRow[]>([{
    taxName: "Sales Tax",
    taxRate: "",
    taxAmount: "",
  }]);

  const formatCurrency = (amount: number | null | undefined) =>
    amount != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
        .format(amount)
      : "—";

  const formatDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleDateString() : "—";

  const openAddModal = () => {
    formStoreName.value = "";
    formStoreNumber.value = "";
    formStoreAddress.value = "";
    formStoreCity.value = "";
    formStoreState.value = "";
    formStoreZip.value = "";
    formReceiptDate.value = new Date().toISOString().split("T")[0];
    formReceiptNumber.value = "";
    formSubtotal.value = "";
    formTotal.value = "";
    formPaymentAccountId.value =
      accounts.find((a) => a.accountType === "checking")?.id?.toString() || "";
    formTransactionId.value = "";
    formItems.value = [{ description: "", quantity: 1, extendedPrice: 0 }];
    formTaxes.value = [{ taxName: "Sales Tax", taxRate: "", taxAmount: "" }];
    isModalOpen.value = true;
  };

  const addTaxRow = () => {
    formTaxes.value = [...formTaxes.value, {
      taxName: "",
      taxRate: "",
      taxAmount: "",
    }];
  };

  const removeTaxRow = (index: number) => {
    formTaxes.value = formTaxes.value.filter((_, i) => i !== index);
  };

  const updateTaxRow = (index: number, field: keyof TaxRow, value: string) => {
    const taxes = [...formTaxes.value];
    taxes[index] = { ...taxes[index], [field]: value };
    formTaxes.value = taxes;
    recalculateTotal();
  };

  const recalculateTotal = () => {
    const subtotal = formItems.value.reduce(
      (sum, item) => sum + (Number(item.extendedPrice) || 0),
      0,
    );
    const discounts = formItems.value.reduce(
      (sum, item) => sum + (Number(item.discountAmount) || 0),
      0,
    );
    formSubtotal.value = subtotal.toFixed(2);
    const taxTotal = formTaxes.value.reduce(
      (sum, tax) => sum + (Number(tax.taxAmount) || 0),
      0,
    );
    formTotal.value = (subtotal - discounts + taxTotal).toFixed(2);
  };

  const getTotalDiscount = () =>
    formItems.value.reduce(
      (sum, item) => sum + (Number(item.discountAmount) || 0),
      0,
    );

  const getTotalTax = () =>
    formTaxes.value.reduce((sum, tax) => sum + (Number(tax.taxAmount) || 0), 0);

  const _getAccountName = (accountId: number) =>
    accounts.find((a) => a.id === accountId)?.name || "Unknown";

  const addItem = () => {
    formItems.value = [...formItems.value, {
      description: "",
      quantity: 1,
      extendedPrice: 0,
    }];
  };

  const removeItem = (index: number) => {
    formItems.value = formItems.value.filter((_, i) => i !== index);
  };

  const updateItem = (
    index: number,
    field: keyof ReceiptItem,
    value: string | number,
  ) => {
    const items = [...formItems.value];
    items[index] = { ...items[index], [field]: value };
    formItems.value = items;
  };

  const calculateTotals = () => {
    recalculateTotal();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    try {
      const receiptData = {
        storeName: formStoreName.value || null,
        storeNumber: formStoreNumber.value || null,
        storeAddress: formStoreAddress.value || null,
        storeCity: formStoreCity.value || null,
        storeState: formStoreState.value || null,
        storeZip: formStoreZip.value || null,
        receiptDate: formReceiptDate.value,
        receiptNumber: formReceiptNumber.value || null,
        subtotal: parseFloat(formSubtotal.value) || null,
        taxTotal: getTotalTax(),
        total: parseFloat(formTotal.value) || null,
        paymentAccountId: formPaymentAccountId.value
          ? parseInt(formPaymentAccountId.value)
          : null,
        transactionId: formTransactionId.value
          ? parseInt(formTransactionId.value)
          : null,
        items: formItems.value.filter((item) => item.description).map((
          item,
          idx,
        ) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || null,
          extendedPrice: item.extendedPrice || 0,
          discountAmount: item.discountAmount || 0,
          taxAmount: item.taxAmount || 0,
          sku: item.sku || null,
          upc: item.upc || null,
          department: item.department || null,
          sortOrder: idx,
        })),
        taxes: formTaxes.value.filter((t) => t.taxName && t.taxAmount).map((
          tax,
          idx,
        ) => ({
          taxName: tax.taxName,
          taxRate: parseFloat(tax.taxRate) || null,
          taxAmount: parseFloat(tax.taxAmount) || 0,
          sortOrder: idx,
        })),
      };

      const res = await fetch(`${API_BASE}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptData),
      });

      if (res.ok) {
        const newReceipt = await res.json();
        receipts.value = [newReceipt, ...receipts.value];
        isModalOpen.value = false;
      }
    } catch (error) {
      console.error("Error creating receipt:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const viewReceipt = (receipt: Receipt) => {
    selectedReceipt.value = receipt;
    viewMode.value = "detail";
    isEditing.value = false;
  };

  const backToList = () => {
    selectedReceipt.value = null;
    viewMode.value = "list";
    isEditing.value = false;
  };

  const startEditing = () => {
    if (!selectedReceipt.value) return;
    editStoreName.value = selectedReceipt.value.storeName || "";
    editReceiptDate.value = selectedReceipt.value.receiptDate?.split("T")[0] ||
      "";
    editTotal.value = selectedReceipt.value.total?.toString() || "";
    isEditing.value = true;
  };

  const cancelEditing = () => {
    isEditing.value = false;
  };

  const saveEditing = async () => {
    if (!selectedReceipt.value) return;
    isSubmitting.value = true;
    try {
      const res = await fetch(
        `${API_BASE}/receipts/${selectedReceipt.value.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: editStoreName.value || null,
            receiptDate: editReceiptDate.value || null,
            total: parseFloat(editTotal.value) || null,
          }),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        selectedReceipt.value = updated;
        receipts.value = receipts.value.map((r) =>
          r.id === updated.id ? updated : r
        );
        isEditing.value = false;
      }
    } catch (error) {
      console.error("Error updating receipt:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const filteredReceipts = () => {
    let result = receipts.value;
    if (filterStoreName.value) {
      result = result.filter((r) =>
        r.storeName?.toLowerCase().includes(filterStoreName.value.toLowerCase())
      );
    }
    if (filterLinked.value === "linked") {
      result = result.filter((r) => r.transactionId != null);
    } else if (filterLinked.value === "unlinked") {
      result = result.filter((r) => r.transactionId == null);
    }
    return result;
  };

  const openUploadModal = () => {
    uploadFile.value = null;
    uploadTransactionId.value = "";
    uploadReceiptDate.value = new Date().toISOString().split("T")[0];
    uploadPreview.value = null;
    isUploadModalOpen.value = true;
  };

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      uploadFile.value = file;

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          uploadPreview.value = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        uploadPreview.value = null;
      }
    }
  };

  const handleUploadSubmit = async (e: Event) => {
    e.preventDefault();
    if (!uploadFile.value) return;

    isSubmitting.value = true;
    try {
      const formData = new FormData();
      formData.append("file", uploadFile.value);
      if (uploadTransactionId.value) {
        formData.append("transactionId", uploadTransactionId.value);
      }
      formData.append("receiptDate", uploadReceiptDate.value);

      const res = await fetch(`${API_BASE}/receipts/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newReceipt = await res.json();
        receipts.value = [newReceipt, ...receipts.value];
        isUploadModalOpen.value = false;
      }
    } catch (error) {
      console.error("Error uploading receipt:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  if (viewMode.value === "detail" && selectedReceipt.value) {
    const receipt = selectedReceipt.value;
    return (
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <button type="button" class="btn btn-ghost" onClick={backToList}>
            ← Back to Receipts
          </button>
          {!isEditing.value && (
            <button
              type="button"
              class="btn btn-outline btn-sm"
              onClick={startEditing}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        <div class="card bg-white shadow-xl">
          <div class="card-body">
            {isEditing.value
              ? (
                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Store Name</span>
                    </label>
                    <input
                      type="text"
                      class="input input-bordered"
                      value={editStoreName.value}
                      onInput={(e) =>
                        editStoreName.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Receipt Date</span>
                    </label>
                    <input
                      type="date"
                      class="input input-bordered"
                      value={editReceiptDate.value}
                      onInput={(e) =>
                        editReceiptDate.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Total</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="input input-bordered"
                      value={editTotal.value}
                      onInput={(e) => editTotal.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="btn btn-primary"
                      onClick={saveEditing}
                      disabled={isSubmitting.value}
                    >
                      {isSubmitting.value
                        ? (
                          <span class="loading loading-spinner loading-sm">
                          </span>
                        )
                        : "Save"}
                    </button>
                    <button type="button" class="btn" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </div>
              )
              : (
                <div class="flex justify-between items-start">
                  <div>
                    <h2 class="text-2xl font-bold">
                      {receipt.storeName || "Unknown Store"}
                    </h2>
                    {receipt.storeNumber && (
                      <div class="text-sm text-slate-500">
                        Store #{receipt.storeNumber}
                      </div>
                    )}
                    {receipt.storeAddress && (
                      <div class="text-sm text-slate-400">
                        {receipt.storeAddress}
                        <br />
                        {receipt.storeCity}, {receipt.storeState}{" "}
                        {receipt.storeZip}
                      </div>
                    )}
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-slate-500">
                      {formatDate(receipt.receiptDate)}
                    </div>
                    {receipt.receiptNumber && (
                      <div class="text-xs text-slate-400">
                        #{receipt.receiptNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div class="divider"></div>

            {/* Items */}
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU/UPC</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div class="font-medium">{item.description}</div>
                        {item.department && (
                          <div class="text-xs text-slate-400">
                            {item.department}
                          </div>
                        )}
                      </td>
                      <td class="text-xs text-slate-500">
                        {item.sku && <div>SKU: {item.sku}</div>}
                        {item.upc && <div>UPC: {item.upc}</div>}
                      </td>
                      <td class="text-right">{item.quantity}</td>
                      <td class="text-right">
                        {formatCurrency(item.extendedPrice)}
                      </td>
                      <td class="text-right text-green-600">
                        {item.discountAmount > 0
                          ? `-${formatCurrency(item.discountAmount)}`
                          : "—"}
                      </td>
                      <td class="text-right text-slate-500">
                        {formatCurrency(item.taxAmount)}
                      </td>
                      <td class="text-right font-semibold">
                        {formatCurrency(
                          item.extendedPrice - item.discountAmount +
                            item.taxAmount,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div class="divider"></div>

            {/* Totals */}
            <div class="flex justify-end">
              <div class="w-64 space-y-1">
                <div class="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discountTotal && receipt.discountTotal > 0 && (
                  <div class="flex justify-between text-green-600">
                    <span>Discounts:</span>
                    <span>-{formatCurrency(receipt.discountTotal)}</span>
                  </div>
                )}
                <div class="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(receipt.taxTotal)}</span>
                </div>
                <div class="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
                {receipt.paymentMethod && (
                  <div class="flex justify-between text-sm text-slate-500">
                    <span>Paid with:</span>
                    <span>
                      {receipt.paymentMethod} {receipt.paymentLastFour &&
                        `****${receipt.paymentLastFour}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Transaction */}
            {receipt.transactionId
              ? (
                <div class="mt-4 p-4 bg-green-50 rounded-lg">
                  <div class="flex justify-between items-center">
                    <div>
                      <span class="text-sm font-medium text-green-800">
                        ✓ Linked to Transaction
                      </span>
                      <span class="text-sm text-green-600 ml-2">
                        #{receipt.transactionId}
                      </span>
                    </div>
                    <a
                      href={`/transactions?highlight=${receipt.transactionId}`}
                      class="btn btn-sm btn-outline btn-success"
                    >
                      View Transaction →
                    </a>
                  </div>
                </div>
              )
              : (
                <div class="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-500">
                      No linked transaction
                    </span>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline"
                      onClick={() => {/* TODO: Link modal */}}
                    >
                      Link to Transaction
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  const displayReceipts = filteredReceipts();

  return (
    <div class="space-y-6">
      {/* Actions */}
      <div class="flex justify-between items-center">
        <span class="text-sm text-slate-500">
          {displayReceipts.length}{" "}
          receipt{displayReceipts.length !== 1 ? "s" : ""}
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-outline btn-primary"
            onClick={openUploadModal}
          >
            📷 Upload Receipt
          </button>
          <button type="button" class="btn btn-primary" onClick={openAddModal}>
            + Add Receipt
          </button>
        </div>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-4 items-end bg-white p-4 rounded-lg shadow">
        <div class="form-control">
          <label class="label">
            <span class="label-text text-xs">Store Name</span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm w-48"
            placeholder="Search stores..."
            value={filterStoreName.value}
            onInput={(e) => filterStoreName.value = e.currentTarget.value}
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text text-xs">Link Status</span>
          </label>
          <select
            class="select select-bordered select-sm"
            value={filterLinked.value}
            onChange={(e) => filterLinked.value = e.currentTarget.value}
          >
            <option value="all">All</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
        </div>
        {(filterStoreName.value || filterLinked.value !== "all") && (
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => {
              filterStoreName.value = "";
              filterLinked.value = "all";
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Receipts List */}
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayReceipts.length === 0
          ? (
            <div class="col-span-full text-center py-12 text-slate-500">
              {receipts.value.length === 0
                ? 'No receipts yet. Click "Add Receipt" to enter your first one.'
                : "No receipts match your filters."}
            </div>
          )
          : displayReceipts.map((receipt) => (
            <div
              key={receipt.id}
              class="card bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => viewReceipt(receipt)}
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-bold">
                      {receipt.storeName || "Unknown Store"}
                    </h3>
                    {receipt.storeNumber && (
                      <div class="text-xs text-slate-400">
                        Store #{receipt.storeNumber}
                      </div>
                    )}
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold">
                      {formatCurrency(receipt.total)}
                    </div>
                    <div class="text-xs text-slate-500">
                      {formatDate(receipt.receiptDate)}
                    </div>
                  </div>
                </div>
                <div class="text-sm text-slate-500 mt-2">
                  {receipt.items?.length || 0}{" "}
                  item{(receipt.items?.length || 0) !== 1 ? "s" : ""}
                </div>
                {receipt.transactionId && (
                  <div class="badge badge-success badge-sm mt-2">
                    Linked to Transaction
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Add Receipt Modal */}
      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 class="font-bold text-lg mb-4">Add Receipt</h3>
            <form onSubmit={handleSubmit}>
              {/* Store Info */}
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text">Store Name *</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    placeholder="e.g., Walmart, Target"
                    value={formStoreName.value}
                    onInput={(e) => formStoreName.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Store #</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    placeholder="1234"
                    value={formStoreNumber.value}
                    onInput={(e) =>
                      formStoreNumber.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text">Address</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    placeholder="123 Main St"
                    value={formStoreAddress.value}
                    onInput={(e) =>
                      formStoreAddress.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">City</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={formStoreCity.value}
                    onInput={(e) => formStoreCity.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">State</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    maxLength={2}
                    value={formStoreState.value}
                    onInput={(e) =>
                      formStoreState.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">ZIP</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={formStoreZip.value}
                    onInput={(e) => formStoreZip.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Receipt Date *</span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered"
                    value={formReceiptDate.value}
                    onInput={(e) =>
                      formReceiptDate.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Receipt #</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={formReceiptNumber.value}
                    onInput={(e) =>
                      formReceiptNumber.value = e.currentTarget.value}
                  />
                </div>
              </div>

              {/* Link to Transaction */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text">Link to Transaction (optional)</span>
                </label>
                <select
                  class="select select-bordered"
                  value={formTransactionId.value}
                  onChange={(e) =>
                    formTransactionId.value = e.currentTarget.value}
                >
                  <option value="">— Create new transaction later —</option>
                  {unmatchedTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {formatDate(tx.transactionDate)} - {tx.payee || "Unknown"}
                      {" "}
                      - {formatCurrency(tx.amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div class="mb-6">
                <div class="flex justify-between items-center mb-2">
                  <label class="label">
                    <span class="label-text font-semibold">Items</span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    onClick={addItem}
                  >
                    + Add Item
                  </button>
                </div>
                <div class="space-y-3">
                  {formItems.value.map((item, idx) => (
                    <div key={idx} class="p-3 bg-slate-50 rounded-lg">
                      <div class="grid grid-cols-12 gap-2 items-end mb-2">
                        <div class="col-span-5">
                          <label class="text-xs text-slate-500">
                            Description
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full"
                            placeholder="Item name"
                            value={item.description || ""}
                            onInput={(e) =>
                              updateItem(
                                idx,
                                "description",
                                e.currentTarget.value,
                              )}
                          />
                        </div>
                        <div class="col-span-2">
                          <label class="text-xs text-slate-500">Qty</label>
                          <input
                            type="number"
                            class="input input-bordered input-sm w-full"
                            placeholder="1"
                            value={item.quantity || 1}
                            onInput={(e) =>
                              updateItem(
                                idx,
                                "quantity",
                                parseFloat(e.currentTarget.value) || 1,
                              )}
                          />
                        </div>
                        <div class="col-span-2">
                          <label class="text-xs text-slate-500">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            class="input input-bordered input-sm w-full"
                            placeholder="0.00"
                            value={item.extendedPrice || ""}
                            onInput={(e) => {
                              updateItem(
                                idx,
                                "extendedPrice",
                                parseFloat(e.currentTarget.value) || 0,
                              );
                              calculateTotals();
                            }}
                          />
                        </div>
                        <div class="col-span-2">
                          <label class="text-xs text-green-600">Discount</label>
                          <input
                            type="number"
                            step="0.01"
                            class="input input-bordered input-sm w-full text-green-600"
                            placeholder="-0.00"
                            value={item.discountAmount || ""}
                            onInput={(e) => {
                              updateItem(
                                idx,
                                "discountAmount",
                                parseFloat(e.currentTarget.value) || 0,
                              );
                              calculateTotals();
                            }}
                          />
                        </div>
                        <div class="col-span-1">
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm text-error"
                            onClick={() => removeItem(idx)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div class="grid grid-cols-12 gap-2 items-end">
                        <div class="col-span-3">
                          <label class="text-xs text-slate-500">SKU</label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full"
                            placeholder="SKU"
                            value={item.sku || ""}
                            onInput={(e) =>
                              updateItem(idx, "sku", e.currentTarget.value)}
                          />
                        </div>
                        <div class="col-span-3">
                          <label class="text-xs text-slate-500">UPC</label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full"
                            placeholder="UPC/Barcode"
                            value={item.upc || ""}
                            onInput={(e) =>
                              updateItem(idx, "upc", e.currentTarget.value)}
                          />
                        </div>
                        <div class="col-span-3">
                          <label class="text-xs text-slate-500">
                            Department
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full"
                            placeholder="Dept"
                            value={item.department || ""}
                            onInput={(e) =>
                              updateItem(
                                idx,
                                "department",
                                e.currentTarget.value,
                              )}
                          />
                        </div>
                        <div class="col-span-3">
                          <label class="text-xs text-slate-500">
                            Discount Reason
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full"
                            placeholder="Coupon, Sale, etc."
                            value={item.discountDescription || ""}
                            onInput={(e) =>
                              updateItem(
                                idx,
                                "discountDescription",
                                e.currentTarget.value,
                              )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax Rows */}
              <div class="mb-6">
                <div class="flex justify-between items-center mb-2">
                  <label class="label">
                    <span class="label-text font-semibold">Taxes</span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    onClick={addTaxRow}
                  >
                    + Add Tax
                  </button>
                </div>
                <div class="space-y-2">
                  {formTaxes.value.map((tax, idx) => (
                    <div key={idx} class="grid grid-cols-12 gap-2 items-end">
                      <div class="col-span-5">
                        <input
                          type="text"
                          class="input input-bordered input-sm w-full"
                          placeholder="Tax Name (e.g., State Sales Tax)"
                          value={tax.taxName}
                          onInput={(e) =>
                            updateTaxRow(idx, "taxName", e.currentTarget.value)}
                        />
                      </div>
                      <div class="col-span-2">
                        <input
                          type="text"
                          class="input input-bordered input-sm w-full"
                          placeholder="Rate %"
                          value={tax.taxRate}
                          onInput={(e) =>
                            updateTaxRow(idx, "taxRate", e.currentTarget.value)}
                        />
                      </div>
                      <div class="col-span-4">
                        <input
                          type="number"
                          step="0.01"
                          class="input input-bordered input-sm w-full"
                          placeholder="Amount"
                          value={tax.taxAmount}
                          onInput={(e) =>
                            updateTaxRow(
                              idx,
                              "taxAmount",
                              e.currentTarget.value,
                            )}
                        />
                      </div>
                      <div class="col-span-1">
                        {formTaxes.value.length > 1 && (
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm text-error"
                            onClick={() => removeTaxRow(idx)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Subtotal</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered"
                    value={formSubtotal.value}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text text-green-600">Discounts</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered text-green-600"
                    value={getTotalDiscount().toFixed(2)}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Tax</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered"
                    value={getTotalTax().toFixed(2)}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-bold">Total</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered font-bold"
                    value={formTotal.value}
                    readOnly
                  />
                </div>
              </div>

              {/* Payment Account */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text">Paid From Account</span>
                </label>
                <select
                  class="select select-bordered"
                  value={formPaymentAccountId.value}
                  onChange={(e) =>
                    formPaymentAccountId.value = e.currentTarget.value}
                >
                  <option value="">— Select Account —</option>
                  {accounts.filter((a) => !a.isClosed).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn"
                  onClick={() => isModalOpen.value = false}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "Save Receipt"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isModalOpen.value = false}>
          </div>
        </div>
      )}

      {/* Upload Receipt Modal */}
      {isUploadModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">📷 Upload Receipt</h3>
            <form onSubmit={handleUploadSubmit}>
              {/* File Input */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">Receipt Image *</span>
                </label>
                <input
                  type="file"
                  class="file-input file-input-bordered file-input-primary w-full"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>

              {/* Preview */}
              {uploadPreview.value && (
                <div class="mb-4">
                  <img
                    src={uploadPreview.value}
                    alt="Receipt preview"
                    class="max-h-48 mx-auto rounded-lg shadow"
                  />
                </div>
              )}

              {/* Receipt Date */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">Receipt Date</span>
                </label>
                <input
                  type="date"
                  class="input input-bordered"
                  value={uploadReceiptDate.value}
                  onInput={(e) =>
                    uploadReceiptDate.value = e.currentTarget.value}
                />
              </div>

              {/* Link to Transaction */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text">Link to Transaction (optional)</span>
                </label>
                <select
                  class="select select-bordered"
                  value={uploadTransactionId.value}
                  onChange={(e) =>
                    uploadTransactionId.value = e.currentTarget.value}
                >
                  <option value="">— Link later —</option>
                  {unmatchedTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {formatDate(tx.transactionDate)} - {tx.payee || "Unknown"}
                      {" "}
                      - {formatCurrency(tx.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn"
                  onClick={() => isUploadModalOpen.value = false}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={isSubmitting.value || !uploadFile.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "Upload"}
                </button>
              </div>
            </form>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isUploadModalOpen.value = false}
          >
          </div>
        </div>
      )}
    </div>
  );
}

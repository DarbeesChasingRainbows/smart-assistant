import { useSignal } from "@preact/signals";
import type {
  Account,
  Receipt,
  ReceiptItem,
  Transaction,
} from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

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

function ReceiptsManagerContent(
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
        toast.success("Receipt saved successfully!");
      } else {
        toast.error("Failed to save receipt");
      }
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast.error("Error creating receipt");
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
        toast.success("Receipt updated");
      } else {
        toast.error("Failed to update receipt");
      }
    } catch (error) {
      console.error("Error updating receipt:", error);
      toast.error("Error updating receipt");
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
        toast.success("Receipt uploaded and processed!");
      } else {
        toast.error("Failed to upload receipt");
      }
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Error uploading receipt");
    } finally {
      isSubmitting.value = false;
    }
  };

  if (viewMode.value === "detail" && selectedReceipt.value) {
    const receipt = selectedReceipt.value;
    return (
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <button
            type="button"
            class="btn btn-ghost text-[#888] hover:text-[#00d9ff] font-mono"
            onClick={backToList}
          >
            ← BACK TO RECEIPTS
          </button>
          {!isEditing.value && (
            <button
              type="button"
              class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] btn-sm min-h-[36px] font-mono"
              onClick={startEditing}
            >
              EDIT
            </button>
          )}
        </div>

        <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
          <div class="card-body p-4 md:p-6">
            {isEditing.value
              ? (
                <div class="space-y-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-[#888]">
                        STORE NAME
                      </span>
                    </label>
                    <input
                      type="text"
                      class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                      value={editStoreName.value}
                      onInput={(e) =>
                        editStoreName.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-[#888]">
                        RECEIPT DATE
                      </span>
                    </label>
                    <input
                      type="date"
                      class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                      value={editReceiptDate.value}
                      onInput={(e) =>
                        editReceiptDate.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-[#888]">
                        TOTAL
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                      value={editTotal.value}
                      onInput={(e) => editTotal.value = e.currentTarget.value}
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="btn bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-mono"
                      onClick={saveEditing}
                      disabled={isSubmitting.value}
                    >
                      {isSubmitting.value
                        ? (
                          <span class="loading loading-spinner loading-sm">
                          </span>
                        )
                        : "SAVE"}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost font-mono"
                      onClick={cancelEditing}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )
              : (
                <div class="flex justify-between items-start">
                  <div>
                    <h2 class="text-xl md:text-2xl font-bold text-[#00d9ff] font-mono">
                      {receipt.storeName?.toUpperCase() || "UNKNOWN STORE"}
                    </h2>
                    {receipt.storeNumber && (
                      <div class="text-xs text-[#888] font-mono">
                        STORE #{receipt.storeNumber}
                      </div>
                    )}
                    {receipt.storeAddress && (
                      <div class="text-[10px] text-[#666] font-mono mt-1 uppercase">
                        {receipt.storeAddress}
                        <br />
                        {receipt.storeCity}, {receipt.storeState}{" "}
                        {receipt.storeZip}
                      </div>
                    )}
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-white font-mono">
                      {formatDate(receipt.receiptDate)}
                    </div>
                    {receipt.receiptNumber && (
                      <div class="text-[10px] text-[#666] font-mono">
                        #{receipt.receiptNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div class="divider before:bg-[#333] after:bg-[#333]"></div>

            {/* Items */}
            <div class="overflow-x-auto">
              <table class="table table-sm w-full">
                <thead>
                  <tr class="bg-[#0a0a0a] border-b border-[#333]">
                    <th class="text-[#888] font-mono text-[10px]">ITEM</th>
                    <th class="text-[#888] font-mono text-[10px]">SKU/UPC</th>
                    <th class="text-right text-[#888] font-mono text-[10px]">
                      QTY
                    </th>
                    <th class="text-right text-[#888] font-mono text-[10px]">
                      PRICE
                    </th>
                    <th class="text-right text-[#888] font-mono text-[10px]">
                      DISC
                    </th>
                    <th class="text-right text-[#888] font-mono text-[10px]">
                      TAX
                    </th>
                    <th class="text-right text-[#888] font-mono text-[10px]">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.items || []).map((item, idx) => (
                    <tr key={idx} class="border-b border-[#333]/50">
                      <td>
                        <div class="font-medium text-white text-xs font-mono">
                          {item.description.toUpperCase()}
                        </div>
                        {item.department && (
                          <div class="text-[10px] text-[#666] font-mono uppercase">
                            {item.department}
                          </div>
                        )}
                      </td>
                      <td class="text-[10px] text-[#666] font-mono">
                        {item.sku && <div>S: {item.sku}</div>}
                        {item.upc && <div>U: {item.upc}</div>}
                      </td>
                      <td class="text-right font-mono text-xs">
                        {item.quantity}
                      </td>
                      <td class="text-right font-mono text-xs">
                        {formatCurrency(item.extendedPrice)}
                      </td>
                      <td class="text-right text-[#00ff88] font-mono text-xs">
                        {item.discountAmount > 0
                          ? `-${formatCurrency(item.discountAmount)}`
                          : "—"}
                      </td>
                      <td class="text-right text-[#888] font-mono text-xs">
                        {formatCurrency(item.taxAmount)}
                      </td>
                      <td class="text-right font-bold text-white font-mono text-xs">
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

            <div class="divider before:bg-[#333] after:bg-[#333]"></div>

            {/* Totals */}
            <div class="flex justify-end">
              <div class="w-full md:w-64 space-y-1 font-mono text-xs">
                <div class="flex justify-between text-[#888]">
                  <span>SUBTOTAL:</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discountTotal && receipt.discountTotal > 0 && (
                  <div class="flex justify-between text-[#00ff88]">
                    <span>DISCOUNTS:</span>
                    <span>-{formatCurrency(receipt.discountTotal)}</span>
                  </div>
                )}
                <div class="flex justify-between text-[#888]">
                  <span>TAX:</span>
                  <span>{formatCurrency(receipt.taxTotal)}</span>
                </div>
                <div class="flex justify-between font-bold text-lg border-t border-[#333] pt-2 text-[#00d9ff]">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(receipt.total)}</span>
                </div>
                {receipt.paymentMethod && (
                  <div class="flex justify-between text-[10px] text-[#666] pt-2">
                    <span>PAID WITH:</span>
                    <span class="uppercase">
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
                <div class="mt-6 p-4 bg-[#00ff88]/5 border border-[#00ff88]/20 rounded">
                  <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <span class="text-xs font-bold text-[#00ff88] font-mono uppercase tracking-wider">
                        ✓ LINKED TO TRANSACTION
                      </span>
                      <span class="text-xs text-[#00ff88]/70 ml-2 font-mono">
                        #{receipt.transactionId}
                      </span>
                    </div>
                    <a
                      href={`/budget/transactions?highlight=${receipt.transactionId}`}
                      class="btn btn-xs bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-mono min-h-[32px]"
                    >
                      VIEW TRANSACTION
                    </a>
                  </div>
                </div>
              )
              : (
                <div class="mt-6 p-4 bg-[#ffb000]/5 border border-[#ffb000]/20 rounded">
                  <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span class="text-xs font-bold text-[#ffb000] font-mono uppercase">
                      NO LINKED TRANSACTION
                    </span>
                    <button
                      type="button"
                      class="btn btn-xs bg-[#ffb000]/20 border-[#ffb000] text-[#ffb000] font-mono min-h-[32px]"
                      onClick={() => {/* TODO: Link modal */}}
                    >
                      LINK NOW
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
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span class="text-xs text-[#888] font-mono uppercase tracking-wider">
          {displayReceipts.length}{" "}
          RECEIPT{displayReceipts.length !== 1 ? "S" : ""} DETECTED
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn bg-[#0a0a0a] border border-[#00d9ff]/50 hover:border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
            onClick={openUploadModal}
          >
            📷 UPLOAD
          </button>
          <button
            type="button"
            class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
            onClick={openAddModal}
          >
            + MANUAL ADD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-4 items-end bg-[#1a1a1a] p-4 border border-[#333] rounded">
        <div class="form-control">
          <label class="label pt-0">
            <span class="label-text text-[10px] text-[#888] font-mono">
              STORE NAME
            </span>
          </label>
          <input
            type="text"
            class="input input-bordered input-sm w-48 bg-[#0a0a0a] border-[#333] text-white font-mono"
            placeholder="SEARCH..."
            value={filterStoreName.value}
            onInput={(e) => filterStoreName.value = e.currentTarget.value}
          />
        </div>
        <div class="form-control">
          <label class="label pt-0">
            <span class="label-text text-[10px] text-[#888] font-mono">
              LINK STATUS
            </span>
          </label>
          <select
            class="select select-bordered select-sm bg-[#0a0a0a] border-[#333] text-white font-mono text-xs"
            value={filterLinked.value}
            onChange={(e) => filterLinked.value = e.currentTarget.value}
          >
            <option value="all">ALL RECEIPTS</option>
            <option value="linked">LINKED ONLY</option>
            <option value="unlinked">UNLINKED ONLY</option>
          </select>
        </div>
        {(filterStoreName.value || filterLinked.value !== "all") && (
          <button
            type="button"
            class="btn btn-ghost btn-sm text-[#666] hover:text-white font-mono text-xs"
            onClick={() => {
              filterStoreName.value = "";
              filterLinked.value = "all";
            }}
          >
            CLEAR FILTERS
          </button>
        )}
      </div>

      {/* Receipts List */}
      <div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {displayReceipts.length === 0
          ? (
            <div class="col-span-full text-center py-16 bg-[#1a1a1a] border border-[#333] rounded">
              <p class="text-[#666] font-mono uppercase tracking-widest">
                {receipts.value.length === 0
                  ? "NO DATA DETECTED"
                  : "NO MATCHING RECORDS"}
              </p>
            </div>
          )
          : displayReceipts.map((receipt) => (
            <div
              key={receipt.id}
              class="card bg-[#1a1a1a] border border-[#333] hover:border-[#00d9ff] transition-all cursor-pointer group"
              onClick={() => viewReceipt(receipt)}
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-start">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-white font-mono truncate group-hover:text-[#00d9ff]">
                      {receipt.storeName?.toUpperCase() || "UNKNOWN STORE"}
                    </h3>
                    {receipt.storeNumber && (
                      <div class="text-[10px] text-[#666] font-mono">
                        ST#{receipt.storeNumber}
                      </div>
                    )}
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-[#00ff88] font-mono">
                      {formatCurrency(receipt.total)}
                    </div>
                    <div class="text-[10px] text-[#888] font-mono uppercase">
                      {formatDate(receipt.receiptDate)}
                    </div>
                  </div>
                </div>
                <div class="flex justify-between items-end mt-4">
                  <div class="text-[10px] text-[#666] font-mono uppercase">
                    {receipt.items?.length || 0} ITEM{receipt.items?.length !==
                        1
                      ? "S"
                      : ""}
                  </div>
                  {receipt.transactionId && (
                    <div class="badge bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20 font-mono text-[9px]">
                      LINKED
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Add Receipt Modal */}
      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              ADD RECEIPT
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Store Info */}
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      STORE NAME *
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    placeholder="e.g., WALMART, TARGET"
                    value={formStoreName.value}
                    onInput={(e) => formStoreName.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      STORE #
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    placeholder="1234"
                    value={formStoreNumber.value}
                    onInput={(e) =>
                      formStoreNumber.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      ADDRESS
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    placeholder="123 MAIN ST"
                    value={formStoreAddress.value}
                    onInput={(e) =>
                      formStoreAddress.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      CITY
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={formStoreCity.value}
                    onInput={(e) => formStoreCity.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      STATE
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    maxLength={2}
                    value={formStoreState.value}
                    onInput={(e) =>
                      formStoreState.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      ZIP
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={formStoreZip.value}
                    onInput={(e) => formStoreZip.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      RECEIPT DATE *
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={formReceiptDate.value}
                    onInput={(e) =>
                      formReceiptDate.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      RECEIPT #
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={formReceiptNumber.value}
                    onInput={(e) =>
                      formReceiptNumber.value = e.currentTarget.value}
                  />
                </div>
              </div>

              {/* Link to Transaction */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    LINK TO TRANSACTION (OPTIONAL)
                  </span>
                </label>
                <select
                  class="select select-bordered bg-[#0a0a0a] border-[#333] text-white font-mono text-xs"
                  value={formTransactionId.value}
                  onChange={(e) =>
                    formTransactionId.value = e.currentTarget.value}
                >
                  <option value="">— CREATE NEW TRANSACTION LATER —</option>
                  {unmatchedTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {formatDate(tx.transactionDate)} - {tx.payee || "UNKNOWN"}
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
                    <span class="label-text font-bold text-[#00d9ff] font-mono text-sm uppercase">
                      ITEMS
                    </span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-[#00d9ff] font-mono"
                    onClick={addItem}
                  >
                    + ADD ITEM
                  </button>
                </div>
                <div class="space-y-3">
                  {formItems.value.map((item, idx) => (
                    <div
                      key={idx}
                      class="p-3 bg-[#0a0a0a] border border-[#333] rounded"
                    >
                      <div class="grid grid-cols-12 gap-2 items-end mb-2">
                        <div class="col-span-5">
                          <label class="text-[10px] text-[#888] font-mono">
                            DESCRIPTION
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-sm w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
                            placeholder="ITEM NAME"
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
                          <label class="text-[10px] text-[#888] font-mono">
                            QTY
                          </label>
                          <input
                            type="number"
                            class="input input-bordered input-sm w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
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
                          <label class="text-[10px] text-[#888] font-mono">
                            PRICE
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            class="input input-bordered input-sm w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
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
                          <label class="text-[10px] text-[#00ff88] font-mono">
                            DISC
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            class="input input-bordered input-sm w-full bg-[#1a1a1a] border-[#333] text-[#00ff88] font-mono"
                            placeholder="0.00"
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
                            class="btn btn-ghost btn-sm text-red-400"
                            onClick={() => removeItem(idx)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div class="grid grid-cols-12 gap-2 items-end">
                        <div class="col-span-3">
                          <label class="text-[10px] text-[#666] font-mono">
                            SKU
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-xs w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
                            placeholder="SKU"
                            value={item.sku || ""}
                            onInput={(e) =>
                              updateItem(idx, "sku", e.currentTarget.value)}
                          />
                        </div>
                        <div class="col-span-3">
                          <label class="text-[10px] text-[#666] font-mono">
                            UPC
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-xs w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
                            placeholder="UPC"
                            value={item.upc || ""}
                            onInput={(e) =>
                              updateItem(idx, "upc", e.currentTarget.value)}
                          />
                        </div>
                        <div class="col-span-3">
                          <label class="text-[10px] text-[#666] font-mono">
                            DEPT
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-xs w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
                            placeholder="DEPT"
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
                          <label class="text-[10px] text-[#666] font-mono">
                            DISC REASON
                          </label>
                          <input
                            type="text"
                            class="input input-bordered input-xs w-full bg-[#1a1a1a] border-[#333] text-white font-mono"
                            placeholder="COUPON, ETC"
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
                    <span class="label-text font-bold text-[#00d9ff] font-mono text-sm uppercase">
                      TAXES
                    </span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-[#00d9ff] font-mono"
                    onClick={addTaxRow}
                  >
                    + ADD TAX
                  </button>
                </div>
                <div class="space-y-2">
                  {formTaxes.value.map((tax, idx) => (
                    <div key={idx} class="grid grid-cols-12 gap-2 items-end">
                      <div class="col-span-5">
                        <input
                          type="text"
                          class="input input-bordered input-sm w-full bg-[#0a0a0a] border-[#333] text-white font-mono"
                          placeholder="TAX NAME"
                          value={tax.taxName}
                          onInput={(e) =>
                            updateTaxRow(idx, "taxName", e.currentTarget.value)}
                        />
                      </div>
                      <div class="col-span-2">
                        <input
                          type="text"
                          class="input input-bordered input-sm w-full bg-[#0a0a0a] border-[#333] text-white font-mono"
                          placeholder="RATE %"
                          value={tax.taxRate}
                          onInput={(e) =>
                            updateTaxRow(idx, "taxRate", e.currentTarget.value)}
                        />
                      </div>
                      <div class="col-span-4">
                        <input
                          type="number"
                          step="0.01"
                          class="input input-bordered input-sm w-full bg-[#0a0a0a] border-[#333] text-white font-mono"
                          placeholder="AMOUNT"
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
                            class="btn btn-ghost btn-sm text-red-400"
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
                    <span class="label-text font-mono text-[10px] text-[#888]">
                      SUBTOTAL
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={formSubtotal.value}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-[10px] text-[#00ff88]">
                      DISCOUNTS
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-[#00ff88] font-mono"
                    value={getTotalDiscount().toFixed(2)}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-[10px] text-[#888]">
                      TAX
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={getTotalTax().toFixed(2)}
                    readOnly
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-[10px] text-[#00d9ff] font-bold">
                      TOTAL
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered bg-[#0a0a0a] border-[#00d9ff]/30 text-[#00d9ff] font-bold font-mono"
                    value={formTotal.value}
                    readOnly
                  />
                </div>
              </div>

              {/* Payment Account */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    PAID FROM ACCOUNT
                  </span>
                </label>
                <select
                  class="select select-bordered bg-[#0a0a0a] border-[#333] text-white font-mono text-xs"
                  value={formPaymentAccountId.value}
                  onChange={(e) =>
                    formPaymentAccountId.value = e.currentTarget.value}
                >
                  <option value="">— SELECT ACCOUNT —</option>
                  {accounts.filter((a) => !a.isClosed).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {(acc.name || "Unknown").toUpperCase()} ({(
                        acc.accountType || "Unknown"
                      ).toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={() => isModalOpen.value = false}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  class="btn bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-mono"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "SAVE RECEIPT"}
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
          <div class="modal-box bg-[#1a1a1a] border border-[#333]">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              📷 UPLOAD RECEIPT
            </h3>
            <form onSubmit={handleUploadSubmit}>
              {/* File Input */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    RECEIPT IMAGE / PDF *
                  </span>
                </label>
                <input
                  type="file"
                  class="file-input file-input-bordered file-input-primary w-full bg-[#0a0a0a] border-[#333] text-[#888] font-mono"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>

              {/* Preview */}
              {uploadPreview.value && (
                <div class="mb-4 bg-[#0a0a0a] p-2 border border-[#333] rounded">
                  <img
                    src={uploadPreview.value}
                    alt="Receipt preview"
                    class="max-h-48 mx-auto rounded shadow-lg"
                  />
                </div>
              )}

              {/* Receipt Date */}
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    RECEIPT DATE
                  </span>
                </label>
                <input
                  type="date"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  value={uploadReceiptDate.value}
                  onInput={(e) =>
                    uploadReceiptDate.value = e.currentTarget.value}
                />
              </div>

              {/* Link to Transaction */}
              <div class="form-control mb-6">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    LINK TO TRANSACTION (OPTIONAL)
                  </span>
                </label>
                <select
                  class="select select-bordered bg-[#0a0a0a] border-[#333] text-white font-mono text-xs"
                  value={uploadTransactionId.value}
                  onChange={(e) =>
                    uploadTransactionId.value = e.currentTarget.value}
                >
                  <option value="">— LINK LATER —</option>
                  {unmatchedTransactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {formatDate(tx.transactionDate)} - {tx.payee || "UNKNOWN"}
                      {" "}
                      - {formatCurrency(tx.amount)}
                    </option>
                  ))}
                </select>
              </div>

              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={() => isUploadModalOpen.value = false}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                  disabled={isSubmitting.value || !uploadFile.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "UPLOAD"}
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

export default function ReceiptsManager(props: Props) {
  return (
    <ErrorBoundary>
      <ReceiptsManagerContent {...props} />
    </ErrorBoundary>
  );
}

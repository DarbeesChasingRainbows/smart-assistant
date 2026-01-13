import { useSignal } from "@preact/signals";
import type {
  Account,
  Category,
  CategoryGroup,
  Transaction,
} from "../types/api.ts";

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
}

export default function TransactionExportIsland(
  { transactions, accounts, categories, categoryGroups }: Props,
) {
  const isOpen = useSignal(false);
  const startDate = useSignal("");
  const endDate = useSignal("");
  const selectedAccount = useSignal<string>("all");
  const includeCleared = useSignal(true);
  const includeUncleared = useSignal(true);
  const isExporting = useSignal(false);

  const openExportModal = () => {
    isOpen.value = true;

    // Set default date range to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    endDate.value = end.toISOString().split("T")[0];
    startDate.value = start.toISOString().split("T")[0];
    selectedAccount.value = "all";
  };

  const closeModal = () => {
    isOpen.value = false;
  };

  const getCategoryName = (categoryKey: string | null | undefined): string => {
    if (!categoryKey) return "Uncategorized";

    for (const group of categoryGroups) {
      const category = group.categories?.find((c) =>
        c.key === categoryKey || c.id?.toString() === categoryKey
      );
      if (category) {
        return `${group.name} > ${category.name}`;
      }
    }

    // Fallback to categories array
    const category = categories.find((c) =>
      c.key === categoryKey || c.id?.toString() === categoryKey
    );
    return category?.name || "Unknown";
  };

  const getAccountName = (accountKey: string | null | undefined): string => {
    if (!accountKey) return "Unknown";

    const account = accounts.find((a) =>
      a.accountKey === accountKey || a.id?.toString() === accountKey
    );
    return account?.accountName || account?.name || "Unknown";
  };

  const filterTransactions = (): Transaction[] => {
    return transactions.filter((txn) => {
      // Date range filter
      if (startDate.value && txn.transactionDate) {
        const txnDate = new Date(txn.transactionDate);
        const start = new Date(startDate.value);
        if (txnDate < start) return false;
      }

      if (endDate.value && txn.transactionDate) {
        const txnDate = new Date(txn.transactionDate);
        const end = new Date(endDate.value);
        end.setHours(23, 59, 59, 999); // Include entire end date
        if (txnDate > end) return false;
      }

      // Account filter
      if (selectedAccount.value !== "all") {
        if (txn.accountKey !== selectedAccount.value) return false;
      }

      // Cleared status filter
      if (!includeCleared.value && txn.isCleared) return false;
      if (!includeUncleared.value && !txn.isCleared) return false;

      return true;
    });
  };

  const generateCSV = (): string => {
    const filtered = filterTransactions();

    // CSV headers
    const headers = [
      "Date",
      "Account",
      "Payee",
      "Category",
      "Memo",
      "Amount",
      "Cleared",
      "Reconciled",
    ];

    // Build CSV rows
    const rows = filtered.map((txn) => {
      const date = txn.transactionDate
        ? new Date(txn.transactionDate).toISOString().split("T")[0]
        : "";
      const account = getAccountName(txn.accountKey);
      const payee = txn.payee || "";
      const category = getCategoryName(txn.categoryKey);
      const memo = txn.memo || "";
      const amount = txn.amount?.toString() || "0";
      const cleared = txn.isCleared ? "Yes" : "No";
      const reconciled = txn.isReconciled ? "Yes" : "No";

      // Escape fields that might contain commas or quotes
      const escapeField = (field: string): string => {
        if (
          field.includes(",") || field.includes('"') || field.includes("\n")
        ) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      return [
        escapeField(date),
        escapeField(account),
        escapeField(payee),
        escapeField(category),
        escapeField(memo),
        amount,
        cleared,
        reconciled,
      ].join(",");
    });

    // Combine headers and rows
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadCSV = () => {
    isExporting.value = true;

    try {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with date range
      const start = startDate.value || "all";
      const end = endDate.value || "all";
      link.download = `transactions_${start}_to_${end}.csv`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      closeModal();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Error exporting transactions. Please try again.");
    } finally {
      isExporting.value = false;
    }
  };

  const filteredCount = filterTransactions().length;

  return (
    <>
      <button
        type="button"
        class="btn btn-outline btn-sm"
        onClick={openExportModal}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export CSV
      </button>

      {isOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Export Transactions</h3>

            <div class="space-y-4">
              {/* Date Range */}
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Start Date</span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered"
                    value={startDate.value}
                    onInput={(e) => startDate.value = e.currentTarget.value}
                  />
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">End Date</span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered"
                    value={endDate.value}
                    onInput={(e) => endDate.value = e.currentTarget.value}
                  />
                </div>
              </div>

              {/* Account Filter */}
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Account</span>
                </label>
                <select
                  class="select select-bordered"
                  value={selectedAccount.value}
                  onChange={(e) =>
                    selectedAccount.value = e.currentTarget.value}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map((account) => (
                    <option
                      key={account.accountKey || account.id}
                      value={account.accountKey || account.id?.toString()}
                    >
                      {account.accountName || account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filters */}
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Include Status</span>
                </label>
                <div class="space-y-2">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={includeCleared.value}
                      onChange={(e) =>
                        includeCleared.value = e.currentTarget.checked}
                    />
                    <span class="label-text">Cleared Transactions</span>
                  </label>
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={includeUncleared.value}
                      onChange={(e) =>
                        includeUncleared.value = e.currentTarget.checked}
                    />
                    <span class="label-text">Uncleared Transactions</span>
                  </label>
                </div>
              </div>

              {/* Preview Count */}
              <div class="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  class="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  >
                  </path>
                </svg>
                <span>
                  {filteredCount} transaction{filteredCount !== 1 ? "s" : ""}
                  {" "}
                  will be exported
                </span>
              </div>
            </div>

            <div class="modal-action">
              <button type="button" class="btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={downloadCSV}
                disabled={isExporting.value || filteredCount === 0}
              >
                {isExporting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "Download CSV"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </>
  );
}

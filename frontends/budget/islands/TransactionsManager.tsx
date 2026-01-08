import { useSignal, useComputed } from "@preact/signals";
import type { Transaction, Account, Category, CategoryGroup, CategoryBalance } from "../types/api.ts";

interface Props {
  initialTransactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  categoryBalances: CategoryBalance[];
  currentPeriodId: number | null;
}

interface SplitRow {
  categoryId: string;
  amount: string;
  memo: string;
}

const API_BASE = "/api";

export default function TransactionsManager({ 
  initialTransactions, 
  accounts, 
  categories, 
  categoryGroups,
  categoryBalances: initialCategoryBalances,
  currentPeriodId 
}: Props) {
  const transactions = useSignal<Transaction[]>(initialTransactions);
  const categoryBalancesSignal = useSignal<CategoryBalance[]>(initialCategoryBalances);
  const accountBalances = useSignal<Map<number, { spent: number; balance: number }>>(new Map());
  const flippedCards = useSignal<Set<number>>(new Set());
  const filterAccountId = useSignal<number | null>(null);
  const isModalOpen = useSignal(false);
  const isSubmitting = useSignal(false);

  // Bulk selection state
  const selectedTxIds = useSignal<Set<number>>(new Set());
  const isBulkCategoryModalOpen = useSignal(false);
  const bulkCategoryId = useSignal<string>("");

  // Split editor state
  const isSplitModalOpen = useSignal(false);
  const splitTransactionId = useSignal<number | null>(null);
  const splitRows = useSignal<SplitRow[]>([]);
  const splitTransactionAmount = useSignal<number>(0);

  // Transfer modal state
  const isTransferModalOpen = useSignal(false);
  const transferFromAccountId = useSignal<string>("");
  const transferToAccountId = useSignal<string>("");
  const transferAmount = useSignal("");
  const transferDate = useSignal(new Date().toISOString().split("T")[0]);
  const transferMemo = useSignal("");

  // Form state
  const formAccountId = useSignal<string>(accounts[0]?.id.toString() || "");
  const formPayee = useSignal("");
  const formAmount = useSignal("");
  const formDate = useSignal(new Date().toISOString().split("T")[0]);
  const formCategoryId = useSignal<string>("");
  const formMemo = useSignal("");
  const formIsInflow = useSignal(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  // Calculate account spent/balance from transactions
  const calculateAccountStats = () => {
    const stats = new Map<number, { spent: number; balance: number }>();
    accounts.forEach(acc => {
      const accTxs = transactions.value.filter(t => t.accountId === acc.id);
      const spent = accTxs.filter(t => t.amount < 0 && !t.isOpeningBalance).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const balance = accTxs.reduce((sum, t) => sum + t.amount, 0);
      stats.set(acc.id, { spent, balance });
    });
    accountBalances.value = stats;
  };

  // Initialize account stats
  if (accountBalances.value.size === 0) {
    calculateAccountStats();
  }

  // Filtered transactions
  const filteredTransactions = useComputed(() => {
    let txs = transactions.value.filter(t => !t.isOpeningBalance);
    if (filterAccountId.value !== null) {
      txs = txs.filter(t => t.accountId === filterAccountId.value);
    }
    return txs.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  });

  const toggleCardFlip = (accountId: number) => {
    const newSet = new Set(flippedCards.value);
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    flippedCards.value = newSet;
  };

  const loadAllTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/transactions/family/1?limit=500`);
      if (res.ok) {
        transactions.value = await res.json();
        calculateAccountStats();
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const refreshCategoryBalances = async () => {
    if (!currentPeriodId) return;
    try {
      const res = await fetch(`${API_BASE}/budget/balances/${currentPeriodId}`);
      if (res.ok) {
        categoryBalancesSignal.value = await res.json();
      }
    } catch (error) {
      console.error("Error refreshing category balances:", error);
    }
  };

  const openAddModal = () => {
    formAccountId.value = accounts[0]?.id.toString() || "";
    formPayee.value = "";
    formAmount.value = "";
    formDate.value = new Date().toISOString().split("T")[0];
    formCategoryId.value = "";
    formMemo.value = "";
    formIsInflow.value = false;
    isModalOpen.value = true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    const amount = parseFloat(formAmount.value) || 0;
    const finalAmount = formIsInflow.value ? Math.abs(amount) : -Math.abs(amount);

    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(formAccountId.value),
          categoryId: formCategoryId.value ? parseInt(formCategoryId.value) : null,
          payPeriodId: currentPeriodId,
          payee: formPayee.value || null,
          memo: formMemo.value || null,
          amount: finalAmount,
          transactionDate: formDate.value,
          isCleared: false,
          isTransfer: false,
        }),
      });
      if (res.ok) {
        await loadAllTransactions();
        await refreshCategoryBalances();
        isModalOpen.value = false;
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const toggleCleared = async (tx: Transaction) => {
    const newStatus = tx.clearedStatus === "cleared" ? "uncleared" : "cleared";
    try {
      await fetch(`${API_BASE}/transactions/${tx.id}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      transactions.value = transactions.value.map(t => 
        t.id === tx.id ? { ...t, clearedStatus: newStatus } : t
      );
    } catch (error) {
      console.error("Error updating cleared status:", error);
    }
  };

  // Split editor functions
  const openSplitEditor = (tx: Transaction) => {
    splitTransactionId.value = tx.id;
    splitTransactionAmount.value = tx.amount;
    // Initialize with existing splits or single row
    if (tx.splits && tx.splits.length > 0) {
      splitRows.value = tx.splits.map(s => ({
        categoryId: s.categoryId?.toString() || "",
        amount: s.amount.toString(),
        memo: s.memo || "",
      }));
    } else {
      splitRows.value = [
        { categoryId: tx.categoryId?.toString() || "", amount: tx.amount.toString(), memo: "" },
      ];
    }
    isSplitModalOpen.value = true;
  };

  const addSplitRow = () => {
    splitRows.value = [...splitRows.value, { categoryId: "", amount: "0", memo: "" }];
  };

  const removeSplitRow = (index: number) => {
    if (splitRows.value.length > 1) {
      splitRows.value = splitRows.value.filter((_, i) => i !== index);
    }
  };

  const updateSplitRow = (index: number, field: keyof SplitRow, value: string) => {
    splitRows.value = splitRows.value.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    );
  };

  const getSplitsTotal = () => {
    return splitRows.value.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  };

  const saveSplits = async () => {
    if (!splitTransactionId.value) return;
    
    const total = getSplitsTotal();
    if (Math.abs(total - splitTransactionAmount.value) > 0.01) {
      alert(`Splits total (${formatCurrency(total)}) must equal transaction amount (${formatCurrency(splitTransactionAmount.value)})`);
      return;
    }

    isSubmitting.value = true;
    try {
      const res = await fetch(`${API_BASE}/transactions/${splitTransactionId.value}/splits/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          splits: splitRows.value.map(row => ({
            categoryId: row.categoryId ? parseInt(row.categoryId) : null,
            amount: parseFloat(row.amount) || 0,
            memo: row.memo || null,
          })),
        }),
      });
      if (res.ok) {
        const newSplits = await res.json();
        transactions.value = transactions.value.map(t => 
          t.id === splitTransactionId.value ? { ...t, splits: newSplits } : t
        );
        isSplitModalOpen.value = false;
      }
    } catch (error) {
      console.error("Error saving splits:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const deleteTransaction = async (tx: Transaction) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await fetch(`${API_BASE}/transactions/${tx.id}`, { method: "DELETE" });
      transactions.value = transactions.value.filter(t => t.id !== tx.id);
      calculateAccountStats();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  // Bulk action functions
  const toggleSelectTx = (txId: number) => {
    const newSet = new Set(selectedTxIds.value);
    if (newSet.has(txId)) {
      newSet.delete(txId);
    } else {
      newSet.add(txId);
    }
    selectedTxIds.value = newSet;
  };

  const selectAllVisible = () => {
    const visibleTxs = filterAccountId.value 
      ? transactions.value.filter(t => t.accountId === filterAccountId.value)
      : transactions.value;
    selectedTxIds.value = new Set(visibleTxs.map(t => t.id));
  };

  const clearSelection = () => {
    selectedTxIds.value = new Set();
  };

  const bulkClear = async () => {
    if (selectedTxIds.value.size === 0) return;
    isSubmitting.value = true;
    try {
      for (const txId of selectedTxIds.value) {
        await fetch(`${API_BASE}/transactions/${txId}/clear`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cleared" }),
        });
      }
      transactions.value = transactions.value.map(t => 
        selectedTxIds.value.has(t.id) ? { ...t, clearedStatus: "cleared" } : t
      );
      clearSelection();
    } catch (error) {
      console.error("Error bulk clearing:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const bulkDelete = async () => {
    if (selectedTxIds.value.size === 0) return;
    if (!confirm(`Delete ${selectedTxIds.value.size} transaction(s)?`)) return;
    isSubmitting.value = true;
    try {
      for (const txId of selectedTxIds.value) {
        await fetch(`${API_BASE}/transactions/${txId}`, { method: "DELETE" });
      }
      transactions.value = transactions.value.filter(t => !selectedTxIds.value.has(t.id));
      clearSelection();
      calculateAccountStats();
    } catch (error) {
      console.error("Error bulk deleting:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const openBulkCategoryModal = () => {
    bulkCategoryId.value = "";
    isBulkCategoryModalOpen.value = true;
  };

  const applyBulkCategory = async () => {
    if (selectedTxIds.value.size === 0 || !bulkCategoryId.value) return;
    isSubmitting.value = true;
    try {
      const categoryId = parseInt(bulkCategoryId.value);
      for (const txId of selectedTxIds.value) {
        await fetch(`${API_BASE}/transactions/${txId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });
      }
      transactions.value = transactions.value.map(t => 
        selectedTxIds.value.has(t.id) ? { ...t, categoryId } : t
      );
      isBulkCategoryModalOpen.value = false;
      clearSelection();
      await refreshCategoryBalances();
    } catch (error) {
      console.error("Error applying bulk category:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const getAccountName = (accountId: number) => accounts.find(a => a.id === accountId)?.name || "Unknown";

  // Transfer functions
  const openTransferModal = () => {
    transferFromAccountId.value = accounts[0]?.id.toString() || "";
    transferToAccountId.value = accounts[1]?.id.toString() || "";
    transferAmount.value = "";
    transferDate.value = new Date().toISOString().split("T")[0];
    transferMemo.value = "";
    isTransferModalOpen.value = true;
  };

  const createTransfer = async () => {
    if (!transferFromAccountId.value || !transferToAccountId.value || !transferAmount.value) return;
    if (transferFromAccountId.value === transferToAccountId.value) {
      alert("Cannot transfer to the same account");
      return;
    }

    isSubmitting.value = true;
    try {
      const res = await fetch(`${API_BASE}/transactions/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId: parseInt(transferFromAccountId.value),
          toAccountId: parseInt(transferToAccountId.value),
          amount: parseFloat(transferAmount.value),
          transactionDate: transferDate.value,
          memo: transferMemo.value || null,
        }),
      });
      if (res.ok) {
        await loadAllTransactions();
        isTransferModalOpen.value = false;
      } else {
        const err = await res.text();
        alert(`Transfer failed: ${err}`);
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  return (
    <div class="space-y-6">
      {/* Account Cards - Flippable */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {accounts.filter(a => !a.isClosed).map(account => {
          const stats = accountBalances.value.get(account.id) || { spent: 0, balance: 0 };
          const isFlipped = flippedCards.value.has(account.id);
          const isSelected = filterAccountId.value === account.id;
          
          return (
            <div 
              key={account.id} 
              class={`card bg-white shadow-lg cursor-pointer transition-all hover:shadow-xl ${isSelected ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                if (filterAccountId.value === account.id) {
                  filterAccountId.value = null;
                } else {
                  filterAccountId.value = account.id;
                }
              }}
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h3 class="font-semibold text-sm truncate">{account.name}</h3>
                    <div class="text-xs text-slate-400 capitalize">{account.accountType.replace("_", " ")}</div>
                  </div>
                  <button 
                    type="button"
                    class="btn btn-ghost btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCardFlip(account.id);
                    }}
                  >
                    ↻
                  </button>
                </div>
                
                {!isFlipped ? (
                  <div class="mt-2">
                    <div class="text-xs text-slate-500">Spent This Period</div>
                    <div class="text-xl font-bold text-red-600">
                      {formatCurrency(stats.spent)}
                    </div>
                  </div>
                ) : (
                  <div class="mt-2">
                    <div class="text-xs text-slate-500">Current Balance</div>
                    <div class={`text-xl font-bold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(stats.balance)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter indicator and Add button */}
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          {filterAccountId.value !== null && (
            <div class="badge badge-primary gap-2">
              Showing: {getAccountName(filterAccountId.value)}
              <button type="button" class="btn btn-ghost btn-xs" onClick={() => filterAccountId.value = null}>×</button>
            </div>
          )}
          <span class="text-sm text-slate-500">
            {filteredTransactions.value.length} transaction{filteredTransactions.value.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-outline" onClick={openTransferModal}>↔️ Transfer</button>
          <button type="button" class="btn btn-primary" onClick={openAddModal}>+ Add Transaction</button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTxIds.value.size > 0 && (
        <div class="flex items-center gap-4 p-3 bg-primary/10 rounded-lg">
          <span class="font-medium">{selectedTxIds.value.size} selected</span>
          <button type="button" class="btn btn-sm btn-outline" onClick={openBulkCategoryModal}>
            Assign Category
          </button>
          <button type="button" class="btn btn-sm btn-outline btn-success" onClick={bulkClear}>
            Mark Cleared
          </button>
          <button type="button" class="btn btn-sm btn-outline btn-error" onClick={bulkDelete}>
            Delete
          </button>
          <button type="button" class="btn btn-sm btn-ghost" onClick={clearSelection}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Transactions List */}
      <div class="card bg-white shadow-xl">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr class="bg-slate-50">
                  <th class="w-10">
                    <input 
                      type="checkbox" 
                      class="checkbox checkbox-sm"
                      checked={selectedTxIds.value.size > 0 && selectedTxIds.value.size === filteredTransactions.value.length}
                      onChange={(e) => e.currentTarget.checked ? selectAllVisible() : clearSelection()}
                    />
                  </th>
                  <th class="w-10">✓</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Payee</th>
                  <th>Category</th>
                  <th>Memo</th>
                  <th class="text-right">Amount</th>
                  <th class="w-10">🧾</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.value.length === 0 ? (
                  <tr><td colSpan={10} class="text-center text-slate-500 py-8">No transactions yet</td></tr>
                ) : filteredTransactions.value.map((tx) => (
                  <tr key={tx.id} class={`hover ${tx.clearedStatus === "reconciled" ? "opacity-50" : ""} ${selectedTxIds.value.has(tx.id) ? "bg-primary/5" : ""}`}>
                    <td>
                      <input 
                        type="checkbox" 
                        class="checkbox checkbox-sm"
                        checked={selectedTxIds.value.has(tx.id)}
                        onChange={() => toggleSelectTx(tx.id)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        class={`btn btn-xs btn-circle ${tx.clearedStatus !== "uncleared" ? "btn-success" : "btn-ghost border"}`}
                        onClick={() => toggleCleared(tx)}
                      >
                        {tx.clearedStatus !== "uncleared" ? "✓" : ""}
                      </button>
                    </td>
                    <td class="text-sm whitespace-nowrap">{formatDate(tx.transactionDate)}</td>
                    <td class="text-sm">
                      <span class="badge badge-ghost badge-sm">{getAccountName(tx.accountId)}</span>
                    </td>
                    <td class="font-medium">{tx.payee || "—"}</td>
                    <td class="text-sm text-slate-500">
                      <div class="flex items-center gap-1">
                        {tx.splits && tx.splits.length > 1 ? (
                          <span class="badge badge-info badge-xs">Split ({tx.splits.length})</span>
                        ) : (
                          categories.find(c => c.id === tx.categoryId)?.name || 
                          <span class="text-slate-400 italic">Uncategorized</span>
                        )}
                        <button 
                          type="button" 
                          class="btn btn-ghost btn-xs opacity-50 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); openSplitEditor(tx); }}
                          title="Split transaction"
                        >
                          ✂️
                        </button>
                      </div>
                    </td>
                    <td class="text-sm text-slate-400 max-w-xs truncate">{tx.memo || ""}</td>
                    <td class={`text-right font-semibold whitespace-nowrap ${tx.amount >= 0 ? "text-green-600" : "text-slate-800"}`}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                    <td>
                      {tx.receipt ? (
                        <a 
                          href={`/receipts?view=${tx.receipt.id}`}
                          class="btn btn-ghost btn-xs text-success"
                          title="View Receipt"
                        >
                          🧾
                        </a>
                      ) : (
                        <a 
                          href={`/receipts?link=${tx.id}`}
                          class="btn btn-ghost btn-xs text-slate-300 hover:text-slate-500"
                          title="Add Receipt"
                        >
                          +
                        </a>
                      )}
                    </td>
                    <td>
                      <button type="button" class="btn btn-ghost btn-xs text-error" onClick={() => deleteTransaction(tx)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-2xl">
            <h3 class="font-bold text-lg mb-4">Add Transaction</h3>
            <form onSubmit={handleSubmit}>
              {/* Inflow/Outflow Toggle */}
              <div class="form-control mb-4">
                <label class="label cursor-pointer justify-start gap-4">
                  <span class={`font-medium ${!formIsInflow.value ? "text-red-600" : "text-slate-400"}`}>Outflow</span>
                  <input
                    type="checkbox"
                    class="toggle toggle-success"
                    checked={formIsInflow.value}
                    onChange={(e) => formIsInflow.value = e.currentTarget.checked}
                  />
                  <span class={`font-medium ${formIsInflow.value ? "text-green-600" : "text-slate-400"}`}>Inflow</span>
                </label>
              </div>

              <div class="grid grid-cols-2 gap-4">
                {/* Account Selector */}
                <div class="form-control">
                  <label class="label"><span class="label-text">Account</span></label>
                  <select 
                    class="select select-bordered" 
                    value={formAccountId.value} 
                    onChange={(e) => formAccountId.value = e.currentTarget.value}
                    required
                  >
                    {accounts.filter(a => !a.isClosed).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div class="form-control">
                  <label class="label"><span class="label-text">Date</span></label>
                  <input type="date" class="input input-bordered" value={formDate.value} onInput={(e) => formDate.value = e.currentTarget.value} required />
                </div>

                <div class="form-control col-span-2">
                  <label class="label"><span class="label-text">Payee</span></label>
                  <input type="text" class="input input-bordered" placeholder="e.g., Walmart, Shell Gas" value={formPayee.value} onInput={(e) => formPayee.value = e.currentTarget.value} />
                </div>

                <div class="form-control">
                  <label class="label"><span class="label-text">Amount</span></label>
                  <input type="number" step="0.01" min="0" class="input input-bordered" placeholder="0.00" value={formAmount.value} onInput={(e) => formAmount.value = e.currentTarget.value} required />
                </div>

                {/* Category with Available Balance */}
                <div class="form-control">
                  <label class="label"><span class="label-text">Category</span></label>
                  <select 
                    class="select select-bordered" 
                    value={formCategoryId.value} 
                    onChange={(e) => formCategoryId.value = e.currentTarget.value}
                  >
                    <option value="">Uncategorized</option>
                    {categoryGroups.map(group => (
                      <optgroup key={group.id} label={group.name}>
                        {group.categories.map(cat => {
                          const bal = categoryBalancesSignal.value.find((b: CategoryBalance) => b.categoryId === cat.id);
                          const available = bal?.available ?? 0;
                          return (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} ({formatCurrency(available)})
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div class="form-control col-span-2">
                  <label class="label"><span class="label-text">Memo</span></label>
                  <input type="text" class="input input-bordered" placeholder="Optional note" value={formMemo.value} onInput={(e) => formMemo.value = e.currentTarget.value} />
                </div>
              </div>

              {/* Category Balances Quick View */}
              {!formIsInflow.value && categoryBalancesSignal.value.length > 0 && (
                <div class="mt-4 p-3 bg-slate-50 rounded-lg max-h-40 overflow-y-auto">
                  <div class="text-xs font-semibold text-slate-500 mb-2">Category Balances</div>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {categoryBalancesSignal.value
                      .filter((b: CategoryBalance) => b.available !== 0)
                      .sort((a: CategoryBalance, b: CategoryBalance) => b.available - a.available)
                      .slice(0, 12)
                      .map((bal: CategoryBalance) => (
                        <div 
                          key={bal.categoryId} 
                          class={`flex justify-between p-1 rounded cursor-pointer hover:bg-slate-100 ${formCategoryId.value === bal.categoryId.toString() ? "bg-primary/10" : ""}`}
                          onClick={() => formCategoryId.value = bal.categoryId.toString()}
                        >
                          <span class="truncate">{bal.categoryName}</span>
                          <span class={bal.available >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(bal.available)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div class="modal-action">
                <button type="button" class="btn" onClick={() => isModalOpen.value = false}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={isSubmitting.value}>
                  {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Save"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isModalOpen.value = false}></div>
        </div>
      )}

      {/* Split Transaction Modal */}
      {isSplitModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box max-w-2xl">
            <h3 class="font-bold text-lg mb-4">✂️ Split Transaction</h3>
            <div class="mb-4 p-3 bg-slate-100 rounded-lg">
              <div class="flex justify-between">
                <span class="font-medium">Transaction Total:</span>
                <span class={`font-bold ${splitTransactionAmount.value >= 0 ? "text-green-600" : "text-slate-800"}`}>
                  {formatCurrency(splitTransactionAmount.value)}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Splits Total:</span>
                <span class={Math.abs(getSplitsTotal() - splitTransactionAmount.value) < 0.01 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(getSplitsTotal())}
                </span>
              </div>
              {Math.abs(getSplitsTotal() - splitTransactionAmount.value) >= 0.01 && (
                <div class="text-xs text-red-500 mt-1">
                  Remaining: {formatCurrency(splitTransactionAmount.value - getSplitsTotal())}
                </div>
              )}
            </div>

            <div class="space-y-3">
              {splitRows.value.map((row, index) => (
                <div key={index} class="flex gap-2 items-start p-2 bg-slate-50 rounded">
                  <div class="form-control flex-1">
                    <label class="label py-0"><span class="label-text text-xs">Category</span></label>
                    <select 
                      class="select select-bordered select-sm w-full"
                      value={row.categoryId}
                      onChange={(e) => updateSplitRow(index, "categoryId", e.currentTarget.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categoryGroups.map(group => (
                        <optgroup key={group.id} label={group.name}>
                          {categories.filter(c => c.categoryGroupId === group.id).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div class="form-control w-28">
                    <label class="label py-0"><span class="label-text text-xs">Amount</span></label>
                    <input 
                      type="number" 
                      step="0.01"
                      class="input input-bordered input-sm"
                      value={row.amount}
                      onInput={(e) => updateSplitRow(index, "amount", e.currentTarget.value)}
                    />
                  </div>
                  <div class="form-control flex-1">
                    <label class="label py-0"><span class="label-text text-xs">Memo</span></label>
                    <input 
                      type="text" 
                      class="input input-bordered input-sm"
                      placeholder="Optional"
                      value={row.memo}
                      onInput={(e) => updateSplitRow(index, "memo", e.currentTarget.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    class="btn btn-ghost btn-sm btn-circle mt-6"
                    onClick={() => removeSplitRow(index)}
                    disabled={splitRows.value.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" class="btn btn-ghost btn-sm mt-3" onClick={addSplitRow}>
              + Add Split
            </button>

            <div class="modal-action">
              <button type="button" class="btn" onClick={() => isSplitModalOpen.value = false}>Cancel</button>
              <button 
                type="button" 
                class="btn btn-primary" 
                onClick={saveSplits}
                disabled={isSubmitting.value || Math.abs(getSplitsTotal() - splitTransactionAmount.value) >= 0.01}
              >
                {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Save Splits"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={() => isSplitModalOpen.value = false}></div>
        </div>
      )}

      {/* Bulk Category Modal */}
      {isBulkCategoryModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Assign Category to {selectedTxIds.value.size} Transaction(s)</h3>
            <div class="form-control">
              <label class="label"><span class="label-text">Category</span></label>
              <select 
                class="select select-bordered w-full"
                value={bulkCategoryId.value}
                onChange={(e) => bulkCategoryId.value = e.currentTarget.value}
              >
                <option value="">Select a category...</option>
                {categoryGroups.map(group => (
                  <optgroup key={group.id} label={group.name}>
                    {categories.filter(c => c.categoryGroupId === group.id).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div class="modal-action">
              <button type="button" class="btn" onClick={() => isBulkCategoryModalOpen.value = false}>Cancel</button>
              <button 
                type="button" 
                class="btn btn-primary" 
                onClick={applyBulkCategory}
                disabled={isSubmitting.value || !bulkCategoryId.value}
              >
                {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Apply"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={() => isBulkCategoryModalOpen.value = false}></div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">↔️ Transfer Between Accounts</h3>
            <div class="space-y-4">
              <div class="form-control">
                <label class="label"><span class="label-text">From Account</span></label>
                <select 
                  class="select select-bordered w-full"
                  value={transferFromAccountId.value}
                  onChange={(e) => transferFromAccountId.value = e.currentTarget.value}
                >
                  {accounts.filter(a => !a.isClosed).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">To Account</span></label>
                <select 
                  class="select select-bordered w-full"
                  value={transferToAccountId.value}
                  onChange={(e) => transferToAccountId.value = e.currentTarget.value}
                >
                  {accounts.filter(a => !a.isClosed).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              {transferFromAccountId.value === transferToAccountId.value && (
                <div class="text-error text-sm">Cannot transfer to the same account</div>
              )}
              <div class="form-control">
                <label class="label"><span class="label-text">Amount</span></label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  class="input input-bordered" 
                  placeholder="0.00"
                  value={transferAmount.value}
                  onInput={(e) => transferAmount.value = e.currentTarget.value}
                />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Date</span></label>
                <input 
                  type="date" 
                  class="input input-bordered" 
                  value={transferDate.value}
                  onInput={(e) => transferDate.value = e.currentTarget.value}
                />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Memo (optional)</span></label>
                <input 
                  type="text" 
                  class="input input-bordered" 
                  placeholder="Optional note"
                  value={transferMemo.value}
                  onInput={(e) => transferMemo.value = e.currentTarget.value}
                />
              </div>
            </div>
            <div class="modal-action">
              <button type="button" class="btn" onClick={() => isTransferModalOpen.value = false}>Cancel</button>
              <button 
                type="button" 
                class="btn btn-primary" 
                onClick={createTransfer}
                disabled={isSubmitting.value || !transferAmount.value || transferFromAccountId.value === transferToAccountId.value}
              >
                {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Create Transfer"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={() => isTransferModalOpen.value = false}></div>
        </div>
      )}
    </div>
  );
}

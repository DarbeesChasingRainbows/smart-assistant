import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type {
  Account,
  Category,
  CategoryBalance,
  CategoryGroup,
  Transaction,
} from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

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

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

const UI_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget"
  : "";

function TransactionsManagerContent({
  initialTransactions = [],
  accounts = [],
  categories = [],
  categoryGroups = [],
  categoryBalances: initialCategoryBalances = [],
  currentPeriodId,
}: Props) {
  const transactions = useSignal<Transaction[]>(initialTransactions ?? []);
  const categoryBalancesSignal = useSignal<CategoryBalance[]>(
    initialCategoryBalances ?? [],
  );
  const accountBalances = useSignal<
    Map<string, { spent: number; balance: number }>
  >(new Map());
  const flippedCards = useSignal<Set<string>>(new Set());
  const filterAccountId = useSignal<string | null>(null);
  const isModalOpen = useSignal(false);
  const isSubmitting = useSignal(false);

  // Bulk selection state
  const selectedTxIds = useSignal<Set<string>>(new Set());
  const isBulkCategoryModalOpen = useSignal(false);
  const bulkCategoryId = useSignal<string>("");

  // Bulk edit state
  const isBulkEditModalOpen = useSignal(false);
  const bulkEditField = useSignal<"date" | "payee" | "memo">("payee");
  const bulkEditValue = useSignal("");

  // Progress tracking
  const bulkProgressCurrent = useSignal(0);
  const bulkProgressTotal = useSignal(0);
  const bulkProgressMessage = useSignal("");

  // Undo/redo history
  interface UndoState {
    action: string;
    transactions: Transaction[];
    timestamp: number;
  }
  const undoHistory = useSignal<UndoState[]>([]);
  const redoHistory = useSignal<UndoState[]>([]);

  // Split editor state
  const isSplitModalOpen = useSignal(false);
  const splitTransactionId = useSignal<string | null>(null);
  const splitRows = useSignal<SplitRow[]>([]);
  const splitTransactionAmount = useSignal<number>(0);
  const splitTransactionSign = useSignal<1 | -1>(-1);

  // Transfer modal state
  const isTransferModalOpen = useSignal(false);
  const transferFromAccountId = useSignal<string>("");
  const transferToAccountId = useSignal<string>("");
  const transferAmount = useSignal("");
  const transferDate = useSignal(new Date().toISOString().split("T")[0]);
  const transferMemo = useSignal("");

  // Form state
  const formAccountId = useSignal<string>(
    accounts[0]?.accountKey ?? accounts[0]?.id?.toString() ?? "",
  );
  const formPayee = useSignal("");
  const formAmount = useSignal("");
  const formDate = useSignal(new Date().toISOString().split("T")[0]);
  const formCategoryId = useSignal<string>("");
  const formMemo = useSignal("");
  const formIsInflow = useSignal(false);

  const getAccountKey = (acc: Account): string =>
    acc.accountKey ?? (acc.id != null ? String(acc.id) : "");
  const getAccountLabel = (acc: Account): string =>
    acc.accountName ?? acc.name ?? "Unknown";
  const getTxAccountKey = (tx: Transaction): string =>
    (tx as unknown as { accountKey?: string; accountId?: number }).accountKey ??
      ((tx as unknown as { accountId?: number }).accountId != null
        ? String((tx as unknown as { accountId?: number }).accountId)
        : "");
  const getTxKey = (tx: Transaction): string =>
    (tx as unknown as { key?: string; id?: number }).key ??
      (((tx as unknown as { id?: number }).id != null)
        ? String((tx as unknown as { id?: number }).id)
        : "");

  useEffect(() => {
    if (!formAccountId.value && accounts.length > 0) {
      const k = getAccountKey(accounts[0]);
      if (k) formAccountId.value = k;
    }
    if (!transferFromAccountId.value && accounts.length > 0) {
      const k = getAccountKey(accounts[0]);
      if (k) transferFromAccountId.value = k;
    }
    if (!transferToAccountId.value && accounts.length > 1) {
      const k = getAccountKey(accounts[1]);
      if (k) transferToAccountId.value = k;
    }
  }, [accounts.length]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();

  // Calculate account spent/balance from transactions
  const calculateAccountStats = () => {
    const stats = new Map<string, { spent: number; balance: number }>();
    accounts.forEach((acc) => {
      const key = getAccountKey(acc);
      if (!key) return;
      const accTxs = transactions.value.filter((t) =>
        getTxAccountKey(t) === key
      );
      const spent = accTxs
        .filter((t) =>
          t.amount < 0 &&
          !(t as unknown as { isOpeningBalance?: boolean }).isOpeningBalance
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const balance = accTxs.reduce((sum, t) => sum + t.amount, 0);
      stats.set(key, { spent, balance });
    });
    accountBalances.value = stats;
  };

  // Initialize account stats after mount (avoid render loops when accounts is empty)
  useEffect(() => {
    calculateAccountStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered transactions
  const filteredTransactions = useComputed(() => {
    let txs = transactions.value.filter((t) =>
      !(t as unknown as { isOpeningBalance?: boolean }).isOpeningBalance
    );
    if (filterAccountId.value !== null) {
      const filterKey = filterAccountId.value;
      txs = txs.filter((t) => getTxAccountKey(t) === filterKey);
    }
    return txs.sort((a, b) =>
      new Date(b.transactionDate).getTime() -
      new Date(a.transactionDate).getTime()
    );
  });

  const _toggleCardFlip = (accountId: string) => {
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
      const res = await fetch(`${API_BASE}/transactions?limit=500`);
      if (res.ok) {
        transactions.value = await res.json();
        calculateAccountStats();
      } else {
        toast.error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Error loading transactions");
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
    const k = accounts[0] ? getAccountKey(accounts[0]) : "";
    if (!formAccountId.value) formAccountId.value = k;
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
    const finalAmount = formIsInflow.value
      ? Math.abs(amount)
      : -Math.abs(amount);

    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountKey: formAccountId.value,
          categoryKey: formCategoryId.value || null,
          payee: formPayee.value || "",
          memo: formMemo.value || null,
          amount: finalAmount,
          transactionDate: formDate.value,
        }),
      });
      if (res.ok) {
        toast.success("Transaction created");
        await loadAllTransactions();
        await refreshCategoryBalances();
        isModalOpen.value = false;
      } else {
        const body = await res.text().catch(() => "");
        console.error(
          "Error creating transaction:",
          res.status,
          res.statusText,
          body,
        );
        toast.error("Failed to create transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Error creating transaction");
    } finally {
      isSubmitting.value = false;
    }
  };

  const toggleCleared = async (tx: Transaction) => {
    const key = getTxKey(tx);
    if (!key) return;

    // LifeOS shape: server toggles isCleared
    if ((tx as unknown as { key?: string }).key) {
      try {
        const res = await fetch(`${API_BASE}/transactions/${key}/clear`, {
          method: "POST",
        });
        if (res.ok) {
          const payload = await res.json().catch(() => null) as {
            isCleared?: boolean;
          } | null;
          const newIsCleared = payload?.isCleared ??
            !(tx as unknown as { isCleared?: boolean }).isCleared;
          transactions.value = transactions.value.map((t) =>
            getTxKey(t) === key
              ? {
                ...(t as unknown as Record<string, unknown>),
                isCleared: newIsCleared,
              } as Transaction
              : t
          );
          toast.success(newIsCleared ? "Cleared" : "Uncleared");
        } else {
          toast.error("Failed to update cleared status");
        }
      } catch (error) {
        console.error("Error updating cleared status:", error);
        toast.error("Error updating cleared status");
      }
      return;
    }

    // Legacy shape
    const newStatus =
      (tx as unknown as { clearedStatus?: string }).clearedStatus === "cleared"
        ? "uncleared"
        : "cleared";
    try {
      const res = await fetch(`${API_BASE}/transactions/${key}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        transactions.value = transactions.value.map((t) =>
          getTxKey(t) === key
            ? {
              ...(t as unknown as Record<string, unknown>),
              clearedStatus: newStatus,
            } as Transaction
            : t
        );
        toast.success(newStatus === "cleared" ? "Cleared" : "Uncleared");
      } else {
        toast.error("Failed to update cleared status");
      }
    } catch (error) {
      console.error("Error updating cleared status:", error);
      toast.error("Error updating cleared status");
    }
  };

  // Split editor functions
  const openSplitEditor = (tx: Transaction) => {
    const txKey = getTxKey(tx);
    if (!txKey) return;
    splitTransactionId.value = txKey;
    splitTransactionAmount.value = Math.abs(tx.amount);
    splitTransactionSign.value = tx.amount < 0 ? -1 : 1;
    // Initialize with existing splits or single row
    if (tx.splits && tx.splits.length > 0) {
      splitRows.value = tx.splits.map((s) => ({
        categoryId:
          (s as unknown as { categoryKey?: string | null }).categoryKey
            ?.toString() || "",
        amount: Math.abs(s.amount).toString(),
        memo: s.memo || "",
      }));
    } else {
      splitRows.value = [
        {
          categoryId: tx.categoryKey?.toString() || "",
          amount: Math.abs(tx.amount).toString(),
          memo: "",
        },
      ];
    }
    isSplitModalOpen.value = true;
  };

  const addSplitRow = () => {
    splitRows.value = [...splitRows.value, {
      categoryId: "",
      amount: "0",
      memo: "",
    }];
  };

  const applySplitPreset = (
    type: "50/50" | "thirds" | "quarters" | "custom",
  ) => {
    const total = Math.abs(splitTransactionAmount.value);

    switch (type) {
      case "50/50":
        splitRows.value = [
          { categoryId: "", amount: (total / 2).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 2).toFixed(2), memo: "" },
        ];
        break;
      case "thirds":
        splitRows.value = [
          { categoryId: "", amount: (total / 3).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 3).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 3).toFixed(2), memo: "" },
        ];
        break;
      case "quarters":
        splitRows.value = [
          { categoryId: "", amount: (total / 4).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 4).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 4).toFixed(2), memo: "" },
          { categoryId: "", amount: (total / 4).toFixed(2), memo: "" },
        ];
        break;
      case "custom":
        splitRows.value = [{ categoryId: "", amount: "0", memo: "" }];
        break;
    }
  };

  const autoDistributeRemaining = () => {
    if (splitRows.value.length === 0) return;

    const total = Math.abs(splitTransactionAmount.value);
    const currentTotal = getSplitsTotal();
    const remaining = total - currentTotal;

    if (Math.abs(remaining) < 0.01) return;

    const lastIndex = splitRows.value.length - 1;
    const lastAmount = parseFloat(splitRows.value[lastIndex].amount) || 0;
    const newAmount = (lastAmount + remaining).toFixed(2);

    updateSplitRow(lastIndex, "amount", newAmount);
  };

  const removeSplitRow = (index: number) => {
    if (splitRows.value.length > 1) {
      splitRows.value = splitRows.value.filter((_, i) => i !== index);
    }
  };

  const updateSplitRow = (
    index: number,
    field: keyof SplitRow,
    value: string,
  ) => {
    const normalized = field === "amount"
      ? (value === "" ? "" : Math.abs(parseFloat(value) || 0).toString())
      : value;
    splitRows.value = splitRows.value.map((row, i) =>
      i === index ? { ...row, [field]: normalized } : row
    );
  };

  const getSplitsTotal = () => {
    return splitRows.value.reduce(
      (sum, row) => sum + (parseFloat(row.amount) || 0),
      0,
    );
  };

  const saveSplits = async () => {
    if (!splitTransactionId.value) return;

    const total = getSplitsTotal();
    if (Math.abs(total - splitTransactionAmount.value) > 0.01) {
      toast.error(
        `Splits total (${
          formatCurrency(total)
        }) must equal transaction amount (${
          formatCurrency(splitTransactionAmount.value)
        })`,
      );
      return;
    }

    isSubmitting.value = true;
    try {
      const res = await fetch(
        `${API_BASE}/transactions/${splitTransactionId.value}/splits/replace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            splits: splitRows.value.map((row) => ({
              categoryKey: row.categoryId || null,
              amount: (parseFloat(row.amount) || 0) *
                splitTransactionSign.value,
              memo: row.memo || null,
            })),
          }),
        },
      );
      if (res.ok) {
        const newSplits = await res.json();
        transactions.value = transactions.value.map((t) =>
          getTxKey(t) === splitTransactionId.value
            ? {
              ...(t as unknown as Record<string, unknown>),
              splits: newSplits,
            } as Transaction
            : t
        );
        toast.success("Splits saved");
        isSplitModalOpen.value = false;
      } else {
        toast.error("Failed to save splits");
      }
    } catch (error) {
      console.error("Error saving splits:", error);
      toast.error("Error saving splits");
    } finally {
      isSubmitting.value = false;
    }
  };

  const deleteTransaction = async (tx: Transaction) => {
    if (!confirm("Delete this transaction?")) return;
    const key = getTxKey(tx);
    try {
      const res = await fetch(`${API_BASE}/transactions/${key}`, {
        method: "DELETE",
      });
      if (res.ok) {
        transactions.value = transactions.value.filter((t) =>
          getTxKey(t) !== key
        );
        calculateAccountStats();
        toast.success("Transaction deleted");
      } else {
        toast.error("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Error deleting transaction");
    }
  };

  // Bulk action functions
  const toggleSelectTx = (txId: string) => {
    const newSet = new Set(selectedTxIds.value);
    if (newSet.has(txId)) {
      newSet.delete(txId);
    } else {
      newSet.add(txId);
    }
    selectedTxIds.value = newSet;
  };

  const selectAllVisible = () => {
    const visibleTxs = filteredTransactions.value;
    selectedTxIds.value = new Set(
      visibleTxs.map((t) => getTxKey(t)).filter(Boolean),
    );
  };

  const clearSelection = () => {
    selectedTxIds.value = new Set();
  };

  const bulkClear = async () => {
    if (selectedTxIds.value.size === 0) return;

    // Save undo state
    saveUndoState("Bulk Clear");

    isSubmitting.value = true;
    bulkProgressTotal.value = selectedTxIds.value.size;
    bulkProgressCurrent.value = 0;
    bulkProgressMessage.value = "Clearing transactions...";

    try {
      const txIds = Array.from(selectedTxIds.value);

      // Batch API calls with Promise.all
      const results = await Promise.all(
        txIds.map(async (txId, index) => {
          const r = await fetch(`${API_BASE}/transactions/${txId}/clear`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cleared" }),
          });
          bulkProgressCurrent.value = index + 1;
          return r.ok;
        }),
      );

      transactions.value = transactions.value.map((t) =>
        selectedTxIds.value.has(getTxKey(t))
          ? {
            ...(t as unknown as Record<string, unknown>),
            clearedStatus: "cleared",
          } as Transaction
          : t
      );
      if (results.every((r) => r)) {
        toast.success(`${txIds.length} transactions cleared`);
      } else {
        toast.warning("Some transactions failed to clear");
      }
      clearSelection();
    } catch (error) {
      console.error("Error bulk clearing:", error);
      toast.error(
        "Error clearing transactions. Some may not have been updated.",
      );
    } finally {
      isSubmitting.value = false;
      bulkProgressTotal.value = 0;
      bulkProgressCurrent.value = 0;
      bulkProgressMessage.value = "";
    }
  };

  const bulkDelete = async () => {
    if (selectedTxIds.value.size === 0) return;
    if (!confirm(`Delete ${selectedTxIds.value.size} transaction(s)?`)) return;

    // Save undo state
    saveUndoState("Bulk Delete");

    isSubmitting.value = true;
    bulkProgressTotal.value = selectedTxIds.value.size;
    bulkProgressCurrent.value = 0;
    bulkProgressMessage.value = "Deleting transactions...";

    try {
      const txIds = Array.from(selectedTxIds.value);

      // Batch API calls with Promise.all
      const results = await Promise.all(
        txIds.map(async (txId, index) => {
          const r = await fetch(`${API_BASE}/transactions/${txId}`, {
            method: "DELETE",
          });
          bulkProgressCurrent.value = index + 1;
          return r.ok;
        }),
      );

      transactions.value = transactions.value.filter((t) =>
        !selectedTxIds.value.has(getTxKey(t))
      );
      if (results.every((r) => r)) {
        toast.success(`${txIds.length} transactions deleted`);
      } else {
        toast.warning("Some transactions failed to delete");
      }
      clearSelection();
      calculateAccountStats();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error(
        "Error deleting transactions. Some may not have been deleted.",
      );
    } finally {
      isSubmitting.value = false;
      bulkProgressTotal.value = 0;
      bulkProgressCurrent.value = 0;
      bulkProgressMessage.value = "";
    }
  };

  const openBulkCategoryModal = () => {
    bulkCategoryId.value = "";
    isBulkCategoryModalOpen.value = true;
  };

  const applyBulkCategory = async () => {
    if (selectedTxIds.value.size === 0 || !bulkCategoryId.value) return;

    // Save undo state
    saveUndoState("Bulk Categorize");

    isSubmitting.value = true;
    bulkProgressTotal.value = selectedTxIds.value.size;
    bulkProgressCurrent.value = 0;
    bulkProgressMessage.value = "Categorizing transactions...";

    try {
      const categoryKey = bulkCategoryId.value;
      const txIds = Array.from(selectedTxIds.value);

      // Batch API calls with Promise.all for parallel execution
      const results = await Promise.all(
        txIds.map(async (txId, index) => {
          const r = await fetch(`${API_BASE}/transactions/${txId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryKey }),
          });
          bulkProgressCurrent.value = index + 1;
          return r.ok;
        }),
      );

      transactions.value = transactions.value.map((t) =>
        selectedTxIds.value.has(getTxKey(t))
          ? {
            ...(t as unknown as Record<string, unknown>),
            categoryKey,
          } as Transaction
          : t
      );
      if (results.every((r) => r)) {
        toast.success(`${txIds.length} transactions categorized`);
      } else {
        toast.warning("Some transactions failed to categorize");
      }
      isBulkCategoryModalOpen.value = false;
      clearSelection();
      await refreshCategoryBalances();
    } catch (error) {
      console.error("Error applying bulk category:", error);
      toast.error(
        "Error categorizing transactions. Some may not have been updated.",
      );
    } finally {
      isSubmitting.value = false;
      bulkProgressTotal.value = 0;
      bulkProgressCurrent.value = 0;
      bulkProgressMessage.value = "";
    }
  };

  // Undo/Redo functions
  const saveUndoState = (action: string) => {
    undoHistory.value = [
      ...undoHistory.value,
      {
        action,
        transactions: JSON.parse(JSON.stringify(transactions.value)),
        timestamp: Date.now(),
      },
    ];
    // Keep only last 20 undo states
    if (undoHistory.value.length > 20) {
      undoHistory.value = undoHistory.value.slice(-20);
    }
    // Clear redo history when new action is performed
    redoHistory.value = [];
  };

  const undo = () => {
    if (undoHistory.value.length === 0) return;
    const lastState = undoHistory.value[undoHistory.value.length - 1];

    // Save current state to redo
    redoHistory.value = [
      ...redoHistory.value,
      {
        action: `Undo ${lastState.action}`,
        transactions: JSON.parse(JSON.stringify(transactions.value)),
        timestamp: Date.now(),
      },
    ];

    // Restore previous state
    transactions.value = JSON.parse(JSON.stringify(lastState.transactions));
    undoHistory.value = undoHistory.value.slice(0, -1);
    calculateAccountStats();
    toast.info(`Undone: ${lastState.action}`);
  };

  const redo = () => {
    if (redoHistory.value.length === 0) return;
    const nextState = redoHistory.value[redoHistory.value.length - 1];

    // Save current state to undo
    undoHistory.value = [
      ...undoHistory.value,
      {
        action: nextState.action,
        transactions: JSON.parse(JSON.stringify(transactions.value)),
        timestamp: Date.now(),
      },
    ];

    // Restore next state
    transactions.value = JSON.parse(JSON.stringify(nextState.transactions));
    redoHistory.value = redoHistory.value.slice(0, -1);
    calculateAccountStats();
    toast.info(`Redone: ${nextState.action.replace("Undo ", "")}`);
  };

  // Bulk edit functions
  const openBulkEditModal = (field: "date" | "payee" | "memo") => {
    bulkEditField.value = field;
    bulkEditValue.value = "";
    isBulkEditModalOpen.value = true;
  };

  const applyBulkEdit = async () => {
    if (selectedTxIds.value.size === 0 || !bulkEditValue.value.trim()) return;

    // Save undo state
    saveUndoState(`Bulk Edit ${bulkEditField.value}`);

    isSubmitting.value = true;
    bulkProgressTotal.value = selectedTxIds.value.size;
    bulkProgressCurrent.value = 0;
    bulkProgressMessage.value = `Updating ${bulkEditField.value}...`;

    try {
      const txIds = Array.from(selectedTxIds.value);
      const field = bulkEditField.value;
      const value = bulkEditValue.value.trim();

      // Build update payload based on field
      const getUpdatePayload = () => {
        if (field === "date") {
          return { transactionDate: value };
        } else if (field === "payee") {
          return { payee: value };
        } else {
          return { memo: value };
        }
      };

      const updatePayload = getUpdatePayload();

      // Batch API calls with Promise.all
      const results = await Promise.all(
        txIds.map(async (txId, index) => {
          const r = await fetch(`${API_BASE}/transactions/${txId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
          bulkProgressCurrent.value = index + 1;
          return r.ok;
        }),
      );

      // Update local state
      transactions.value = transactions.value.map((t) => {
        if (!selectedTxIds.value.has(getTxKey(t))) return t;

        if (field === "date") {
          return {
            ...(t as unknown as Record<string, unknown>),
            transactionDate: value,
          } as Transaction;
        } else if (field === "payee") {
          return {
            ...(t as unknown as Record<string, unknown>),
            payee: value,
          } as Transaction;
        } else {
          return {
            ...(t as unknown as Record<string, unknown>),
            memo: value,
          } as Transaction;
        }
      });

      if (results.every((r) => r)) {
        toast.success(`${txIds.length} transactions updated`);
      } else {
        toast.warning("Some transactions failed to update");
      }
      isBulkEditModalOpen.value = false;
      clearSelection();
    } catch (error) {
      console.error(`Error bulk editing ${bulkEditField.value}:`, error);
      toast.error(
        `Error updating ${bulkEditField.value}. Some transactions may not have been updated.`,
      );
    } finally {
      isSubmitting.value = false;
      bulkProgressTotal.value = 0;
      bulkProgressCurrent.value = 0;
      bulkProgressMessage.value = "";
    }
  };

  const getAccountName = (tx: Transaction) => {
    const key = getTxAccountKey(tx);
    if (!key) return "Unknown";
    return accounts.find((a) => getAccountKey(a) === key)?.accountName ??
      accounts.find((a) => getAccountKey(a) === key)?.name ??
      "Unknown";
  };

  const getAccountNameByKey = (accountKey: string) => {
    if (!accountKey) return "Unknown";
    return accounts.find((a) => getAccountKey(a) === accountKey)?.accountName ??
      accounts.find((a) => getAccountKey(a) === accountKey)?.name ??
      "Unknown";
  };

  // Transfer functions
  const openTransferModal = () => {
    transferFromAccountId.value = accounts[0] ? getAccountKey(accounts[0]) : "";
    transferToAccountId.value = accounts[1] ? getAccountKey(accounts[1]) : "";
    transferAmount.value = "";
    transferDate.value = new Date().toISOString().split("T")[0];
    transferMemo.value = "";
    isTransferModalOpen.value = true;
  };

  const createTransfer = async () => {
    if (
      !transferFromAccountId.value || !transferToAccountId.value ||
      !transferAmount.value
    ) return;
    if (transferFromAccountId.value === transferToAccountId.value) {
      toast.error("Cannot transfer to the same account");
      return;
    }

    isSubmitting.value = true;
    try {
      const res = await fetch(`${API_BASE}/transactions/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountKey: transferFromAccountId.value,
          toAccountKey: transferToAccountId.value,
          amount: parseFloat(transferAmount.value),
          transactionDate: transferDate.value,
          memo: transferMemo.value || null,
        }),
      });
      if (res.ok) {
        toast.success("Transfer complete");
        await loadAllTransactions();
        isTransferModalOpen.value = false;
      } else {
        const err = await res.text();
        toast.error(`Transfer failed: ${err}`);
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Error creating transfer");
    } finally {
      isSubmitting.value = false;
    }
  };

  return (
    <div class="space-y-4 md:space-y-6">
      {/* Filter indicator, Undo/Redo, and Add button */}
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div class="flex flex-wrap items-center gap-2">
          {filterAccountId.value !== null && (
            <div class="badge bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff] gap-2 font-mono min-h-[32px]">
              {getAccountNameByKey(filterAccountId.value)}
              <button
                type="button"
                class="btn btn-ghost btn-xs min-h-[24px] min-w-[24px]"
                onClick={() => filterAccountId.value = null}
                aria-label="Clear filter"
              >
                ×
              </button>
            </div>
          )}
          <span class="text-sm text-[#888] font-mono">
            {filteredTransactions.value.length}{" "}
            transaction{filteredTransactions.value.length !== 1 ? "s" : ""}
          </span>

          {/* Undo/Redo Buttons */}
          <div class="flex gap-1">
            <button
              type="button"
              class="btn btn-sm btn-ghost min-h-[44px] min-w-[44px] border border-[#333] hover:border-[#00d9ff] text-[#888] hover:text-[#00d9ff]"
              onClick={undo}
              disabled={undoHistory.value.length === 0}
              title={undoHistory.value.length > 0
                ? `Undo: ${
                  undoHistory.value[undoHistory.value.length - 1].action
                }`
                : "Nothing to undo"}
              aria-label="Undo last action"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost min-h-[44px] min-w-[44px] border border-[#333] hover:border-[#00d9ff] text-[#888] hover:text-[#00d9ff]"
              onClick={redo}
              disabled={redoHistory.value.length === 0}
              title={redoHistory.value.length > 0
                ? `Redo: ${
                  redoHistory.value[redoHistory.value.length - 1].action
                }`
                : "Nothing to redo"}
              aria-label="Redo last action"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button
            type="button"
            class="bg-[#111111] border border-[#00d9ff]/50 hover:border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
            onClick={openTransferModal}
          >
            <span class="mr-2">⇄</span>Transfer
          </button>
          <button
            type="button"
            class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
            onClick={openAddModal}
          >
            <span class="mr-2">+</span>Add Transaction
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTxIds.value.size > 0 && (
        <div class="flex items-center gap-2 p-3 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded flex-wrap">
          <span class="font-bold text-[#00d9ff] font-mono text-sm">
            {selectedTxIds.value.size} SELECTED
          </span>

          {/* Bulk Edit Dropdown */}
          <div class="dropdown">
            <label
              tabIndex={0}
              class="btn btn-xs min-h-[32px] bg-[#333] border-[#444] text-[#888] hover:border-[#00d9ff] hover:text-[#00d9ff] font-mono"
            >
              EDIT
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </label>
            <ul
              tabIndex={0}
              class="dropdown-content z-[1] menu p-2 shadow bg-[#1a1a1a] border border-[#333] rounded w-52 font-mono text-xs"
            >
              <li>
                <a
                  onClick={() => openBulkEditModal("date")}
                  class="text-[#888] hover:text-[#00d9ff] hover:bg-[#00d9ff]/10"
                >
                  📅 CHANGE DATE
                </a>
              </li>
              <li>
                <a
                  onClick={() => openBulkEditModal("payee")}
                  class="text-[#888] hover:text-[#00d9ff] hover:bg-[#00d9ff]/10"
                >
                  👤 CHANGE PAYEE
                </a>
              </li>
              <li>
                <a
                  onClick={() => openBulkEditModal("memo")}
                  class="text-[#888] hover:text-[#00d9ff] hover:bg-[#00d9ff]/10"
                >
                  📝 CHANGE MEMO
                </a>
              </li>
            </ul>
          </div>

          <button
            type="button"
            class="btn btn-xs min-h-[32px] bg-[#333] border-[#444] text-[#888] hover:border-[#00d9ff] hover:text-[#00d9ff] font-mono"
            onClick={openBulkCategoryModal}
          >
            CATEGORY
          </button>
          <button
            type="button"
            class="btn btn-xs min-h-[32px] bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-mono"
            onClick={bulkClear}
            disabled={isSubmitting.value}
          >
            CLEAR
          </button>
          <button
            type="button"
            class="btn btn-xs min-h-[32px] bg-red-500/20 border-red-500 text-red-400 font-mono"
            onClick={bulkDelete}
            disabled={isSubmitting.value}
          >
            DELETE
          </button>
          <button
            type="button"
            class="btn btn-xs min-h-[32px] btn-ghost text-[#666] hover:text-white font-mono"
            onClick={clearSelection}
          >
            CLEAR SELECTION
          </button>
        </div>
      )}

      {/* Transactions List */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-0">
          {/* Mobile: Horizontal scroll wrapper */}
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                  <th class="w-10 text-[#888] font-mono text-xs">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-primary"
                      checked={selectedTxIds.value.size > 0 &&
                        selectedTxIds.value.size ===
                          filteredTransactions.value.length}
                      onChange={(e) =>
                        e.currentTarget.checked
                          ? selectAllVisible()
                          : clearSelection()}
                      aria-label="Select all transactions"
                    />
                  </th>
                  <th class="w-10 text-[#888] font-mono text-xs">CLR</th>
                  <th class="text-[#888] font-mono text-xs">DATE</th>
                  <th class="text-[#888] font-mono text-xs">ACCOUNT</th>
                  <th class="text-[#888] font-mono text-xs">PAYEE</th>
                  <th class="text-[#888] font-mono text-xs">CATEGORY</th>
                  <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                    MEMO
                  </th>
                  <th class="text-right text-[#888] font-mono text-xs">
                    AMOUNT
                  </th>
                  <th class="w-10 text-[#888] font-mono text-xs hidden md:table-cell">
                    RCP
                  </th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.value.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={10}
                        class="text-center text-[#888] py-8 font-mono"
                      >
                        No transactions yet
                      </td>
                    </tr>
                  )
                  : filteredTransactions.value.map((tx) => (
                    <tr
                      key={getTxKey(tx)}
                      class={`border-b border-[#333] hover:bg-[#1a1a1a] ${
                        ((tx as unknown as { isReconciled?: boolean })
                            .isReconciled ??
                            ((tx as unknown as { clearedStatus?: string })
                              .clearedStatus === "reconciled"))
                          ? "opacity-50"
                          : ""
                      } ${
                        selectedTxIds.value.has(getTxKey(tx))
                          ? "bg-[#00d9ff]/10"
                          : ""
                      }`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm checkbox-primary"
                          checked={selectedTxIds.value.has(getTxKey(tx))}
                          onChange={() => toggleSelectTx(getTxKey(tx))}
                          aria-label={`Select transaction ${
                            tx.payee || "untitled"
                          }`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          class={`btn btn-xs btn-circle min-h-[32px] min-w-[32px] ${
                            ((tx as unknown as { isCleared?: boolean })
                                .isCleared ??
                                ((tx as unknown as { clearedStatus?: string })
                                  .clearedStatus !== "uncleared"))
                              ? "bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88]"
                              : "btn-ghost border border-[#333] text-[#888]"
                          }`}
                          onClick={() => toggleCleared(tx)}
                          aria-label="Toggle cleared status"
                        >
                          {((tx as unknown as { isCleared?: boolean })
                              .isCleared ??
                              ((tx as unknown as { clearedStatus?: string })
                                .clearedStatus !== "uncleared"))
                            ? "✓"
                            : ""}
                        </button>
                      </td>
                      <td class="text-sm whitespace-nowrap text-white font-mono">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td class="text-sm">
                        <span class="badge bg-[#333] text-[#888] border-[#444] badge-sm font-mono">
                          {getAccountName(tx)}
                        </span>
                      </td>
                      <td class="font-medium text-white">{tx.payee || "—"}</td>
                      <td class="text-sm text-[#888]">
                        <div class="flex items-center gap-1">
                          {tx.splits && tx.splits.length > 1
                            ? (
                              <span class="badge bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/40 badge-xs font-mono">
                                SPLIT ({tx.splits.length})
                              </span>
                            )
                            : (
                              <span class="font-mono text-xs">
                                {categories.find((c) => c.id === tx.categoryId)
                                  ?.name ||
                                  (
                                    <span class="text-[#888] italic">
                                      Uncategorized
                                    </span>
                                  )}
                              </span>
                            )}
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs min-h-[28px] min-w-[28px] opacity-50 hover:opacity-100 text-[#888] hover:text-[#00d9ff]"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSplitEditor(tx);
                            }}
                            title="Split transaction"
                            aria-label="Split transaction"
                          >
                            <span class="text-base">✂</span>
                          </button>
                        </div>
                      </td>
                      <td class="text-sm text-[#888] max-w-xs truncate font-mono hidden sm:table-cell">
                        {tx.memo || ""}
                      </td>
                      <td
                        class={`text-right font-semibold whitespace-nowrap font-mono ${
                          tx.amount >= 0 ? "text-[#00ff88]" : "text-white"
                        }`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td class="hidden md:table-cell">
                        {tx.receipt
                          ? (
                            <a
                              href={`${UI_BASE}/receipts?view=${tx.receipt.id}`}
                              class="btn btn-ghost btn-xs min-h-[32px] min-w-[32px] text-[#00ff88] hover:text-[#00ff88]/80"
                              title="View Receipt"
                              aria-label="View receipt"
                            >
                              <span class="text-base">🧾</span>
                            </a>
                          )
                          : (
                            <a
                              href={`${UI_BASE}/receipts?link=${tx.id}`}
                              class="btn btn-ghost btn-xs min-h-[32px] min-w-[32px] text-[#888] hover:text-[#00d9ff]"
                              title="Add Receipt"
                              aria-label="Add receipt"
                            >
                              <span class="text-base">+</span>
                            </a>
                          )}
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs min-h-[32px] min-w-[32px] text-red-400 hover:text-red-300"
                          onClick={() => deleteTransaction(tx)}
                          aria-label="Delete transaction"
                        >
                          <span class="text-lg">×</span>
                        </button>
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
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-2xl">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              ADD TRANSACTION
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Inflow/Outflow Toggle */}
              <div class="form-control mb-4">
                <label class="label cursor-pointer justify-start gap-4">
                  <span
                    class={`font-bold font-mono text-xs ${
                      !formIsInflow.value ? "text-red-500" : "text-[#444]"
                    }`}
                  >
                    OUTFLOW
                  </span>
                  <input
                    type="checkbox"
                    class="toggle toggle-success"
                    checked={formIsInflow.value}
                    onChange={(e) =>
                      formIsInflow.value = e.currentTarget.checked}
                  />
                  <span
                    class={`font-bold font-mono text-xs ${
                      formIsInflow.value ? "text-[#00ff88]" : "text-[#444]"
                    }`}
                  >
                    INFLOW
                  </span>
                </label>
              </div>

              <div class="grid grid-cols-2 gap-4">
                {/* Account Selector */}
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      ACCOUNT
                    </span>
                  </label>
                  <select
                    class="select select-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    value={formAccountId.value}
                    onChange={(e) =>
                      formAccountId.value = e.currentTarget.value}
                    required
                  >
                    {(accounts || []).filter((a) =>
                      !(a as unknown as { isClosed?: boolean }).isClosed
                    ).map((acc) => (
                      <option
                        key={getAccountKey(acc)}
                        value={getAccountKey(acc)}
                      >
                        {getAccountLabel(acc).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      DATE
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    value={formDate.value}
                    onInput={(e) => formDate.value = e.currentTarget.value}
                    required
                  />
                </div>

                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      PAYEE
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    placeholder="e.g., WALMART, SHELL GAS"
                    value={formPayee.value}
                    onInput={(e) => formPayee.value = e.currentTarget.value}
                  />
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      AMOUNT
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    placeholder="0.00"
                    value={formAmount.value}
                    onInput={(e) => formAmount.value = e.currentTarget.value}
                    required
                  />
                </div>

                {/* Category with Available Balance */}
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      CATEGORY
                    </span>
                  </label>
                  <select
                    class="select select-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    value={formCategoryId.value}
                    onChange={(e) =>
                      formCategoryId.value = e.currentTarget.value}
                  >
                    <option value="">UNCATEGORIZED</option>
                    {(categoryGroups || []).map((group) => (
                      <optgroup
                        key={group.id}
                        label={group.name.toUpperCase()}
                        class="bg-[#1a1a1a]"
                      >
                        {(group.categories || []).map((cat) => {
                          const catKey = cat.key || cat.id?.toString();
                          const bal = categoryBalancesSignal.value.find((
                            b: CategoryBalance,
                          ) => b.categoryKey === catKey);
                          const available = bal?.available ?? 0;
                          return (
                            <option key={catKey} value={catKey}>
                              {cat.name.toUpperCase()} ({formatCurrency(
                                available,
                              )})
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      MEMO
                    </span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    placeholder="OPTIONAL NOTE"
                    value={formMemo.value}
                    onInput={(e) => formMemo.value = e.currentTarget.value}
                  />
                </div>
              </div>

              {/* Category Balances Quick View */}
              {!formIsInflow.value && categoryBalancesSignal.value.length > 0 &&
                (
                  <div class="mt-4 p-3 bg-[#0a0a0a] border border-[#333] rounded max-h-40 overflow-y-auto">
                    <div class="text-[10px] font-bold text-[#666] mb-2 font-mono uppercase">
                      CATEGORY BALANCES
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] font-mono">
                      {categoryBalancesSignal.value
                        .filter((b: CategoryBalance) => b.available !== 0)
                        .sort((a: CategoryBalance, b: CategoryBalance) =>
                          b.available - a.available
                        )
                        .slice(0, 12)
                        .map((bal: CategoryBalance) => (
                          <div
                            key={bal.categoryKey}
                            class={`flex justify-between p-1 rounded cursor-pointer border border-transparent hover:border-[#00d9ff]/30 hover:bg-[#00d9ff]/5 ${
                              formCategoryId.value === bal.categoryKey
                                ? "bg-[#00d9ff]/10 border-[#00d9ff]/30 text-[#00d9ff]"
                                : "text-[#888]"
                            }`}
                            onClick={() =>
                              formCategoryId.value = bal.categoryKey}
                          >
                            <span class="truncate">
                              {bal.categoryName.toUpperCase()}
                            </span>
                            <span
                              class={bal.available >= 0
                                ? "text-[#00ff88]"
                                : "text-red-500"}
                            >
                              {formatCurrency(bal.available)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

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
                  class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "SAVE TRANSACTION"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isModalOpen.value = false}>
          </div>
        </div>
      )}

      {/* Split Transaction Modal - ENHANCED */}
      {isSplitModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] max-w-2xl">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              ✂️ SPLIT TRANSACTION
            </h3>

            {/* Preset Buttons */}
            <div class="mb-4">
              <label class="label py-0">
                <span class="label-text font-mono text-[10px] text-[#888]">
                  QUICK PRESETS:
                </span>
              </label>
              <div class="flex gap-2 flex-wrap mt-1">
                {["50/50", "thirds", "quarters"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    class="btn btn-xs bg-[#333] border-[#444] text-[#888] hover:border-[#00d9ff] hover:text-[#00d9ff] font-mono"
                    onClick={() =>
                      applySplitPreset(p as "50/50" | "thirds" | "quarters")}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
                <button
                  type="button"
                  class="btn btn-xs btn-ghost text-red-400 font-mono"
                  onClick={() => applySplitPreset("custom")}
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Enhanced Total Indicator with Border Color */}
            <div
              class={`mb-4 p-4 bg-[#0a0a0a] rounded border-2 font-mono ${
                Math.abs(
                    getSplitsTotal() - Math.abs(splitTransactionAmount.value),
                  ) < 0.01
                  ? "border-[#00ff88]/30"
                  : "border-red-500/30"
              }`}
            >
              <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] text-[#888]">TRANSACTION TOTAL:</span>
                <span class="text-lg font-bold text-white">
                  {formatCurrency(Math.abs(splitTransactionAmount.value))}
                </span>
              </div>
              <div class="divider before:bg-[#333] after:bg-[#333] my-1"></div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] text-[#888]">SPLITS TOTAL:</span>
                <span
                  class={`text-lg font-bold ${
                    Math.abs(
                        getSplitsTotal() -
                          Math.abs(splitTransactionAmount.value),
                      ) < 0.01
                      ? "text-[#00ff88]"
                      : "text-red-500"
                  }`}
                >
                  {formatCurrency(getSplitsTotal())}
                </span>
              </div>
              {Math.abs(
                    getSplitsTotal() - Math.abs(splitTransactionAmount.value),
                  ) >= 0.01 && (
                <div class="flex justify-between items-center mt-2 pt-2 border-t border-[#333]">
                  <span class="text-[10px] text-[#888]">
                    {getSplitsTotal() < Math.abs(splitTransactionAmount.value)
                      ? "REMAINING:"
                      : "OVER BY:"}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-base font-bold text-red-500">
                      {formatCurrency(
                        Math.abs(
                          Math.abs(splitTransactionAmount.value) -
                            getSplitsTotal(),
                        ),
                      )}
                    </span>
                    {getSplitsTotal() <
                        Math.abs(splitTransactionAmount.value) && (
                      <button
                        type="button"
                        class="btn btn-xs bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-mono"
                        onClick={autoDistributeRemaining}
                      >
                        AUTO-FIX
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div class="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {splitRows.value.map((row, index) => (
                <div
                  key={index}
                  class={`grid grid-cols-[1fr_100px_1fr_auto] gap-2 items-end p-2 bg-[#0a0a0a] border border-[#333] rounded ${
                    !row.categoryId && parseFloat(row.amount) > 0
                      ? "border-[#ffb000]/50"
                      : ""
                  }`}
                >
                  <div class="form-control">
                    <label class="label py-0">
                      <span class="label-text text-[10px] text-[#888] font-mono">
                        CATEGORY
                      </span>
                    </label>
                    <select
                      class="select select-bordered select-xs w-full !bg-[#1a1a1a] border-[#333] !text-white font-mono"
                      value={row.categoryId}
                      onChange={(e) =>
                        updateSplitRow(
                          index,
                          "categoryId",
                          e.currentTarget.value,
                        )}
                    >
                      <option value="">UNCATEGORIZED</option>
                      {(categoryGroups || []).map((group) => (
                        <optgroup
                          key={group.id}
                          label={group.name.toUpperCase()}
                          class="bg-[#1a1a1a]"
                        >
                          {(categories || []).filter((c) => {
                            const groupKey = group.key || group.id?.toString();
                            return (groupKey && c.groupKey === groupKey) ||
                              c.categoryGroupId === group.id;
                          }).map((cat) => {
                            const catKey = cat.key || cat.id?.toString();
                            return (
                              <option key={catKey} value={catKey}>
                                {cat.name.toUpperCase()}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div class="form-control">
                    <label class="label py-0">
                      <span class="label-text text-[10px] text-[#888] font-mono">
                        AMOUNT
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="input input-bordered input-xs !bg-[#1a1a1a] border-[#333] !text-white font-mono text-right"
                      value={row.amount}
                      onInput={(e) =>
                        updateSplitRow(index, "amount", e.currentTarget.value)}
                    />
                  </div>
                  <div class="form-control">
                    <label class="label py-0">
                      <span class="label-text text-[10px] text-[#888] font-mono">
                        MEMO
                      </span>
                    </label>
                    <input
                      type="text"
                      class="input input-bordered input-xs !bg-[#1a1a1a] border-[#333] !text-white font-mono"
                      placeholder="NOTE"
                      value={row.memo}
                      onInput={(e) =>
                        updateSplitRow(index, "memo", e.currentTarget.value)}
                    />
                  </div>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-red-400"
                    onClick={() => removeSplitRow(index)}
                    disabled={splitRows.value.length <= 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              class="btn btn-ghost btn-xs mt-3 text-[#00d9ff] font-mono"
              onClick={addSplitRow}
            >
              + ADD SPLIT ROW
            </button>

            <div class="modal-action">
              <button
                type="button"
                class="btn font-mono"
                onClick={() => isSplitModalOpen.value = false}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                onClick={saveSplits}
                disabled={isSubmitting.value ||
                  Math.abs(
                      getSplitsTotal() - Math.abs(splitTransactionAmount.value),
                    ) >=
                    0.01}
              >
                {isSubmitting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "SAVE SPLITS"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isSplitModalOpen.value = false}
          >
          </div>
        </div>
      )}
      {/* Bulk Category Modal */}
      {isBulkCategoryModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333]">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              BULK CATEGORIZE
            </h3>
            <p class="text-[#888] text-xs mb-4 font-mono">
              ASSIGN CATEGORY TO {selectedTxIds.value.size} TRANSACTIONS.
            </p>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  CATEGORY
                </span>
              </label>
              <select
                class="select select-bordered w-full !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                value={bulkCategoryId.value}
                onChange={(e) => bulkCategoryId.value = e.currentTarget.value}
              >
                <option value="">SELECT A CATEGORY...</option>
                {(categoryGroups || []).map((group) => (
                  <optgroup
                    key={group.id}
                    label={group.name.toUpperCase()}
                    class="bg-[#1a1a1a]"
                  >
                    {(group.categories || []).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name.toUpperCase()}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div class="modal-action">
              <button
                type="button"
                class="btn font-mono"
                onClick={() => isBulkCategoryModalOpen.value = false}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                onClick={applyBulkCategory}
                disabled={isSubmitting.value || !bulkCategoryId.value}
              >
                {isSubmitting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "APPLY"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isBulkCategoryModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333]">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              ↔️ ACCOUNT TRANSFER
            </h3>
            <div class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    FROM ACCOUNT
                  </span>
                </label>
                <select
                  class="select select-bordered w-full !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  value={transferFromAccountId.value}
                  onChange={(e) =>
                    transferFromAccountId.value = e.currentTarget.value}
                >
                  {(accounts || []).filter((a) =>
                    !(a as unknown as { isClosed?: boolean }).isClosed
                  ).map((acc) => (
                    <option key={getAccountKey(acc)} value={getAccountKey(acc)}>
                      {getAccountLabel(acc).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    TO ACCOUNT
                  </span>
                </label>
                <select
                  class="select select-bordered w-full !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  value={transferToAccountId.value}
                  onChange={(e) =>
                    transferToAccountId.value = e.currentTarget.value}
                >
                  {(accounts || []).filter((a) =>
                    !(a as unknown as { isClosed?: boolean }).isClosed
                  ).map((acc) => (
                    <option key={getAccountKey(acc)} value={getAccountKey(acc)}>
                      {getAccountLabel(acc).toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              {transferFromAccountId.value === transferToAccountId.value && (
                <div class="text-red-500 font-mono text-[10px] uppercase">
                  ⚠️ CANNOT TRANSFER TO SAME ACCOUNT
                </div>
              )}
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    AMOUNT
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  placeholder="0.00"
                  value={transferAmount.value}
                  onInput={(e) => transferAmount.value = e.currentTarget.value}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    DATE
                  </span>
                </label>
                <input
                  type="date"
                  class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  value={transferDate.value}
                  onInput={(e) => transferDate.value = e.currentTarget.value}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    MEMO (OPTIONAL)
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  placeholder="OPTIONAL NOTE"
                  value={transferMemo.value}
                  onInput={(e) => transferMemo.value = e.currentTarget.value}
                />
              </div>
            </div>
            <div class="modal-action">
              <button
                type="button"
                class="btn font-mono"
                onClick={() => isTransferModalOpen.value = false}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                onClick={createTransfer}
                disabled={isSubmitting.value || !transferAmount.value ||
                  transferFromAccountId.value === transferToAccountId.value}
              >
                {isSubmitting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "CREATE TRANSFER"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isTransferModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333]">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              BULK EDIT {bulkEditField.value.toUpperCase()}
            </h3>
            <p class="text-[#888] text-xs mb-4 font-mono">
              UPDATING {selectedTxIds.value.size} TRANSACTIONS.
            </p>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-mono text-xs text-[#888]">
                  NEW {bulkEditField.value.toUpperCase()}
                </span>
              </label>
              {bulkEditField.value === "date"
                ? (
                  <input
                    type="date"
                    class="input input-bordered w-full !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    value={bulkEditValue.value}
                    onInput={(e) => bulkEditValue.value = e.currentTarget.value}
                  />
                )
                : (
                  <input
                    type="text"
                    class="input input-bordered w-full !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    placeholder={`ENTER NEW ${bulkEditField.value.toUpperCase()}...`}
                    value={bulkEditValue.value}
                    onInput={(e) => bulkEditValue.value = e.currentTarget.value}
                  />
                )}
            </div>
            <div class="modal-action">
              <button
                type="button"
                class="btn font-mono"
                onClick={() => isBulkEditModalOpen.value = false}
              >
                CANCEL
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 border-[#00d9ff] text-[#00d9ff] font-mono"
                onClick={applyBulkEdit}
                disabled={isSubmitting.value || !bulkEditValue.value.trim()}
              >
                {isSubmitting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "APPLY"}
              </button>
            </div>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isBulkEditModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {bulkProgressTotal.value > 0 && (
        <div class="toast toast-center z-[100]">
          <div class="alert bg-[#0a0a0a] border-2 border-[#00d9ff] shadow-2xl min-w-[300px]">
            <div class="flex flex-col w-full gap-2">
              <div class="flex items-center gap-3">
                <span class="loading loading-spinner text-[#00d9ff]"></span>
                <div class="font-bold text-[#00d9ff] font-mono text-xs uppercase">
                  {bulkProgressMessage.value}
                </div>
              </div>
              <div class="text-[10px] text-[#888] font-mono">
                {bulkProgressCurrent.value} / {bulkProgressTotal.value}{" "}
                OPERATIONS COMPLETED
              </div>
              <progress
                class="progress progress-primary w-full bg-[#333]"
                value={bulkProgressCurrent.value}
                max={bulkProgressTotal.value}
              >
              </progress>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsManager(props: Props) {
  return (
    <ErrorBoundary>
      <TransactionsManagerContent {...props} />
    </ErrorBoundary>
  );
}

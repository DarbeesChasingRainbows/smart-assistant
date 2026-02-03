import { useSignal } from "@preact/signals";
import type { Bill, BillType, Category, DebtType } from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

interface Props {
  initialBills: Bill[];
  categories: Category[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const BILL_TYPES: { value: BillType; label: string; color: string }[] = [
  { value: "bill", label: "Bill", color: "#00d9ff" },
  { value: "subscription", label: "Subscription", color: "#bd00ff" },
  { value: "debt", label: "Debt", color: "#ff6b00" },
];

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: "credit_card", label: "Credit Card" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "student_loan", label: "Student Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

function BillsManagerContent({ initialBills, categories }: Props) {
  const bills = useSignal<Bill[]>(initialBills);
  const isModalOpen = useSignal(false);
  const editingBill = useSignal<Bill | null>(null);
  const isSubmitting = useSignal(false);
  const markingPaidId = useSignal<number | null>(null);

  const formName = useSignal("");
  const formAmount = useSignal("0");
  const formDueDay = useSignal("1");
  const formFrequency = useSignal("monthly");
  const formCategoryId = useSignal<string>("");
  const formIsAutoPay = useSignal(false);
  const formReminderDays = useSignal("3");
  const formNotes = useSignal("");
  // Bill type and debt-specific fields
  const formBillType = useSignal<BillType>("bill");
  const formDebtType = useSignal<DebtType | "">("");
  const formTotalBalance = useSignal("");
  const formInterestRate = useSignal("");
  const formMinimumPayment = useSignal("");
  const formOriginalAmount = useSignal("");
  // Filter state
  const filterBillType = useSignal<BillType | "all">("all");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const totalMonthly = () => {
    return bills.value.filter((b) => b.isActive).reduce((sum, b) => {
      const monthly = b.frequency === "weekly"
        ? b.amount * 4.33
        : b.frequency === "biweekly"
        ? b.amount * 2.17
        : b.frequency === "quarterly"
        ? b.amount / 3
        : b.frequency === "yearly"
        ? b.amount / 12
        : b.amount;
      return sum + monthly;
    }, 0);
  };

  const openAddModal = () => {
    editingBill.value = null;
    formName.value = "";
    formAmount.value = "0";
    formDueDay.value = "1";
    formFrequency.value = "monthly";
    formCategoryId.value = "";
    formIsAutoPay.value = false;
    formReminderDays.value = "3";
    formNotes.value = "";
    // Reset bill type and debt fields
    formBillType.value = "bill";
    formDebtType.value = "";
    formTotalBalance.value = "";
    formInterestRate.value = "";
    formMinimumPayment.value = "";
    formOriginalAmount.value = "";
    isModalOpen.value = true;
  };

  const openEditModal = (bill: Bill) => {
    editingBill.value = bill;
    formName.value = bill.name;
    formAmount.value = bill.amount.toString();
    formDueDay.value = bill.dueDay.toString();
    formFrequency.value = bill.frequency;
    formCategoryId.value = bill.categoryId?.toString() || "";
    formIsAutoPay.value = bill.isAutoPay;
    formReminderDays.value = bill.reminderDays.toString();
    formNotes.value = bill.notes || "";
    // Set bill type and debt fields
    formBillType.value = bill.billType || "bill";
    formDebtType.value = bill.debtType || "";
    formTotalBalance.value = bill.totalBalance?.toString() || "";
    formInterestRate.value = bill.interestRate?.toString() || "";
    formMinimumPayment.value = bill.minimumPayment?.toString() || "";
    formOriginalAmount.value = bill.originalAmount?.toString() || "";
    isModalOpen.value = true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    const payload = {
      name: formName.value,
      amount: parseFloat(formAmount.value) || 0,
      dueDay: parseInt(formDueDay.value) || 1,
      frequency: formFrequency.value,
      categoryId: formCategoryId.value ? parseInt(formCategoryId.value) : null,
      isAutoPay: formIsAutoPay.value,
      reminderDays: parseInt(formReminderDays.value) || 3,
      notes: formNotes.value || null,
      // Bill type and debt-specific fields
      billType: formBillType.value,
      debtType: formBillType.value === "debt" ? formDebtType.value || null : null,
      totalBalance: formBillType.value === "debt" && formTotalBalance.value
        ? parseFloat(formTotalBalance.value)
        : null,
      interestRate: formBillType.value === "debt" && formInterestRate.value
        ? parseFloat(formInterestRate.value)
        : null,
      minimumPayment: formBillType.value === "debt" && formMinimumPayment.value
        ? parseFloat(formMinimumPayment.value)
        : null,
      originalAmount: formBillType.value === "debt" && formOriginalAmount.value
        ? parseFloat(formOriginalAmount.value)
        : null,
    };

    try {
      if (editingBill.value) {
        const res = await fetch(`${API_BASE}/bills/${editingBill.value.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          bills.value = bills.value.map((b) =>
            b.id === updated.id ? updated : b
          );
          toast.success("Bill updated successfully!");
        } else {
          toast.error("Failed to update bill");
        }
      } else {
        const res = await fetch(`${API_BASE}/bills`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          bills.value = [...bills.value, created];
          toast.success("Bill created successfully!");
        } else {
          toast.error("Failed to create bill");
        }
      }
      isModalOpen.value = false;
    } catch (error) {
      console.error("Error saving bill:", error);
      toast.error("Failed to save bill");
    } finally {
      isSubmitting.value = false;
    }
  };

  const markPaid = async (bill: Bill) => {
    markingPaidId.value = bill.id;

    try {
      const res = await fetch(`${API_BASE}/bills/${bill.id}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidDate: new Date().toISOString(),
          actualAmount: bill.amount,
          memo: `Bill payment: ${bill.name}`,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to mark bill as paid");
      }

      const result = await res.json();

      // Refresh bills to show updated lastPaidDate and nextDueDate
      const billsRes = await fetch(`${API_BASE}/bills?activeOnly=false`);
      if (billsRes.ok) {
        bills.value = await billsRes.json();
      }

      // Show success message via toast
      toast.success(
        `${bill.name} marked as paid! Next due: ${
          new Date(result.nextDueDate).toLocaleDateString()
        }`,
      );
    } catch (error) {
      console.error("Error marking paid:", error);
      toast.error(
        error instanceof Error ? error.message : "Error marking bill as paid",
      );
    } finally {
      markingPaidId.value = null;
    }
  };

  const deleteBill = async (bill: Bill) => {
    if (!confirm(`Delete "${bill.name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/bills/${bill.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        bills.value = bills.value.filter((b) => b.id !== bill.id);
        toast.success("Bill deleted");
      } else {
        toast.error("Failed to delete bill");
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("Failed to delete bill");
    }
  };

  const getDueStatus = (bill: Bill) => {
    if (!bill.nextDueDate) return { class: "badge-ghost", text: "No date" };
    const due = new Date(bill.nextDueDate);
    const today = new Date();
    const daysUntil = Math.ceil(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil < 0) {
      return { class: "badge-error", text: `${Math.abs(daysUntil)}d overdue` };
    }
    if (daysUntil <= 3) {
      return { class: "badge-warning", text: `${daysUntil}d` };
    }
    if (daysUntil <= 7) return { class: "badge-info", text: `${daysUntil}d` };
    return { class: "badge-ghost", text: `${daysUntil}d` };
  };

  // Calculate debt totals
  const totalDebt = () => {
    return bills.value
      .filter((b) => b.isActive && b.billType === "debt" && b.totalBalance != null)
      .reduce((sum, b) => sum + (b.totalBalance || 0), 0);
  };

  const debtCount = () => {
    return bills.value.filter((b) => b.isActive && b.billType === "debt").length;
  };

  // Calculate total monthly interest across all debts
  const totalMonthlyInterest = () => {
    return bills.value
      .filter((b) => b.isActive && b.billType === "debt" && b.totalBalance && b.interestRate)
      .reduce((sum, b) => {
        const monthlyRate = (b.interestRate || 0) / 100 / 12;
        return sum + (b.totalBalance || 0) * monthlyRate;
      }, 0);
  };

  // Calculate payoff months for a debt
  const calculatePayoffMonths = (balance: number, payment: number, apr: number): number | null => {
    if (payment <= 0 || balance <= 0) return null;
    const monthlyRate = apr / 100 / 12;
    if (monthlyRate === 0) {
      return Math.ceil(balance / payment);
    }
    const monthlyInterest = balance * monthlyRate;
    if (payment <= monthlyInterest) return null; // Payment doesn't cover interest
    // Formula: n = -log(1 - (r * P) / M) / log(1 + r)
    const n = -Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate);
    return Math.ceil(n);
  };

  // Calculate interest savings when paying extra
  const calculateInterestSavings = (
    balance: number,
    minPayment: number,
    extraPayment: number,
    apr: number
  ): { monthsSaved: number; interestSaved: number } => {
    if (apr === 0 || balance <= 0) return { monthsSaved: 0, interestSaved: 0 };
    
    const monthlyRate = apr / 100 / 12;
    const minMonths = calculatePayoffMonths(balance, minPayment, apr);
    const extraMonths = calculatePayoffMonths(balance, minPayment + extraPayment, apr);
    
    if (!minMonths || !extraMonths) return { monthsSaved: 0, interestSaved: 0 };
    
    // Calculate total interest paid with minimum payments
    let totalInterestMin = 0;
    let balanceMin = balance;
    for (let i = 0; i < minMonths && balanceMin > 0; i++) {
      const interest = balanceMin * monthlyRate;
      totalInterestMin += interest;
      balanceMin = balanceMin + interest - minPayment;
    }
    
    // Calculate total interest paid with extra payments
    let totalInterestExtra = 0;
    let balanceExtra = balance;
    const totalPayment = minPayment + extraPayment;
    for (let i = 0; i < extraMonths && balanceExtra > 0; i++) {
      const interest = balanceExtra * monthlyRate;
      totalInterestExtra += interest;
      balanceExtra = balanceExtra + interest - totalPayment;
    }
    
    return {
      monthsSaved: minMonths - extraMonths,
      interestSaved: Math.max(0, totalInterestMin - totalInterestExtra)
    };
  };

  // Get debt payoff projection
  const getPayoffDate = (bill: Bill): string | null => {
    if (bill.billType !== "debt" || !bill.totalBalance || !bill.amount) return null;
    const months = calculatePayoffMonths(bill.totalBalance, bill.amount, bill.interestRate || 0);
    if (!months) return null;
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // Get highest interest debt (for avalanche strategy)
  const highestInterestDebt = () => {
    const debts = bills.value.filter((b) => b.isActive && b.billType === "debt" && b.interestRate);
    if (debts.length === 0) return null;
    return debts.reduce((highest, current) => 
      (current.interestRate || 0) > (highest.interestRate || 0) ? current : highest
    );
  };

  // Get smallest balance debt (for snowball strategy)
  const smallestBalanceDebt = () => {
    const debts = bills.value.filter((b) => b.isActive && b.billType === "debt" && b.totalBalance);
    if (debts.length === 0) return null;
    return debts.reduce((smallest, current) => 
      (current.totalBalance || Infinity) < (smallest.totalBalance || Infinity) ? current : smallest
    );
  };

  // Filter bills by type
  const filteredBills = () => {
    return bills.value.filter((b) => {
      if (!b.isActive) return false;
      if (filterBillType.value === "all") return true;
      return (b.billType || "bill") === filterBillType.value;
    });
  };

  return (
    <div class="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Bills Total */}
        <div class="card bg-theme-secondary shadow-xl border border-theme">
          <div class="card-body p-4">
            <h2 class="text-sm text-theme-secondary font-mono">MONTHLY BILLS</h2>
            <div class="text-2xl font-bold text-theme-primary font-mono">
              {formatCurrency(totalMonthly())}
            </div>
            <div class="text-xs text-theme-secondary font-mono">
              {bills.value.filter((b) => b.isActive).length} active
            </div>
          </div>
        </div>

        {/* Debt Summary Card */}
        {debtCount() > 0 && (
          <div class="card bg-theme-secondary shadow-xl border border-accent-orange/50">
            <div class="card-body p-4">
              <h2 class="text-sm text-accent-orange font-mono">TOTAL DEBT</h2>
              <div class="text-2xl font-bold text-accent-orange font-mono">
                {formatCurrency(totalDebt())}
              </div>
              <div class="text-xs text-theme-secondary font-mono">
                {debtCount()} debt account{debtCount() !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Interest Card */}
        {debtCount() > 0 && totalMonthlyInterest() > 0 && (
          <div class="card bg-theme-secondary shadow-xl border border-red-500/50">
            <div class="card-body p-4">
              <h2 class="text-sm text-red-400 font-mono">MONTHLY INTEREST</h2>
              <div class="text-2xl font-bold text-red-400 font-mono">
                {formatCurrency(totalMonthlyInterest())}
              </div>
              <div class="text-xs text-theme-secondary font-mono">
                {formatCurrency(totalMonthlyInterest() * 12)}/year
              </div>
            </div>
          </div>
        )}

        {/* Add Button Card */}
        <div class="card bg-theme-secondary shadow-xl border border-theme flex items-center justify-center">
          <div class="card-body p-4 flex items-center justify-center">
            <button
              type="button"
              class="btn bg-accent-cyan/20 hover:bg-accent-cyan/30 border border-accent-cyan text-accent-cyan min-h-[44px] font-mono w-full"
              onClick={openAddModal}
            >
              <span class="mr-2">+</span>Add Bill
            </button>
          </div>
        </div>
      </div>

      {/* Debt Strategy Cards - Only show when there are debts */}
      {debtCount() > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Interest Savings Calculator */}
          {highestInterestDebt() && (
            <div class="card bg-theme-secondary shadow-xl border border-accent-green/30">
              <div class="card-body p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">💰</span>
                  <h3 class="text-sm text-accent-green font-mono font-bold">PAY $100 EXTRA</h3>
                </div>
                <p class="text-xs text-theme-secondary mb-2">On your highest interest debt</p>
                {(() => {
                  const debt = highestInterestDebt();
                  if (!debt || !debt.totalBalance || !debt.amount || !debt.interestRate) return null;
                  const savings = calculateInterestSavings(
                    debt.totalBalance,
                    debt.minimumPayment || debt.amount,
                    100,
                    debt.interestRate
                  );
                  return (
                    <div class="bg-theme-tertiary rounded-lg p-3 border border-theme">
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-theme-secondary font-mono">Interest Saved:</span>
                        <span class="text-sm text-accent-green font-mono font-bold">
                          {formatCurrency(savings.interestSaved)}
                        </span>
                      </div>
                      <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-theme-secondary font-mono">Months Saved:</span>
                        <span class="text-sm text-accent-green font-mono font-bold">
                          {savings.monthsSaved}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Avalanche Strategy */}
          {debtCount() > 1 && highestInterestDebt() && (
            <div class="card bg-theme-secondary shadow-xl border border-accent-orange/30">
              <div class="card-body p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏔️</span>
                  <h3 class="text-sm text-accent-orange font-mono font-bold">AVALANCHE</h3>
                </div>
                <p class="text-xs text-theme-secondary mb-2">Pay highest interest first</p>
                <div class="bg-theme-tertiary rounded-lg p-3 border border-theme">
                  <div class="text-theme-primary font-mono text-sm truncate">{highestInterestDebt()?.name}</div>
                  <div class="flex gap-4 mt-1">
                    <span class="text-xs text-accent-orange font-mono">
                      {highestInterestDebt()?.interestRate}% APR
                    </span>
                    <span class="text-xs text-theme-secondary font-mono">
                      {formatCurrency(highestInterestDebt()?.totalBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Snowball Strategy */}
          {debtCount() > 1 && smallestBalanceDebt() && (
            <div class="card bg-theme-secondary shadow-xl border border-accent-cyan/30">
              <div class="card-body p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">⛄</span>
                  <h3 class="text-sm text-accent-cyan font-mono font-bold">SNOWBALL</h3>
                </div>
                <p class="text-xs text-theme-secondary mb-2">Pay smallest balance first</p>
                <div class="bg-theme-tertiary rounded-lg p-3 border border-theme">
                  <div class="text-theme-primary font-mono text-sm truncate">{smallestBalanceDebt()?.name}</div>
                  <div class="flex gap-4 mt-1">
                    <span class="text-xs text-accent-cyan font-mono">
                      {formatCurrency(smallestBalanceDebt()?.totalBalance || 0)}
                    </span>
                    <span class="text-xs text-theme-secondary font-mono">
                      {smallestBalanceDebt()?.interestRate || 0}% APR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div class="flex gap-2 flex-wrap">
        <button
          type="button"
          class={`btn btn-sm font-mono ${
            filterBillType.value === "all"
              ? "bg-accent-cyan/20 border-accent-cyan text-accent-cyan"
              : "btn-ghost border border-theme text-theme-secondary"
          }`}
          onClick={() => filterBillType.value = "all"}
        >
          ALL
        </button>
        {BILL_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            class={`btn btn-sm font-mono ${
              filterBillType.value === type.value
                ? ""
                : "btn-ghost border border-theme text-theme-secondary"
            }`}
            style={filterBillType.value === type.value
              ? { backgroundColor: `${type.color}20`, borderColor: type.color, color: type.color }
              : {}}
            onClick={() => filterBillType.value = type.value}
          >
            {type.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div class="card bg-theme-secondary shadow-xl border border-theme">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-theme-tertiary border-b-2 border-accent-cyan">
                  <th class="text-theme-secondary font-mono text-xs">BILL</th>
                  <th class="text-theme-secondary font-mono text-xs">AMOUNT</th>
                  <th class="text-theme-secondary font-mono text-xs hidden sm:table-cell">
                    DUE DAY
                  </th>
                  <th class="text-theme-secondary font-mono text-xs hidden md:table-cell">
                    FREQUENCY
                  </th>
                  <th class="text-theme-secondary font-mono text-xs hidden lg:table-cell">
                    LAST PAID
                  </th>
                  <th class="text-theme-secondary font-mono text-xs">NEXT DUE</th>
                  <th class="text-theme-secondary font-mono text-xs hidden sm:table-cell">
                    STATUS
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBills().map((bill) => {
                  const status = getDueStatus(bill);
                  return (
                    <tr
                      key={bill.id}
                      class="border-b border-theme hover:bg-theme-tertiary"
                    >
                      <td>
                        <div class="font-medium flex items-center gap-2 flex-wrap text-theme-primary">
                          {/* Bill Type Badge */}
                          {(() => {
                            const billType = bill.billType || "bill";
                            const typeConfig = BILL_TYPES.find((t) => t.value === billType);
                            return (
                              <span
                                class="badge badge-xs font-mono"
                                style={{
                                  backgroundColor: `${typeConfig?.color || "#00d9ff"}20`,
                                  color: typeConfig?.color || "#00d9ff",
                                  borderColor: `${typeConfig?.color || "#00d9ff"}40`,
                                }}
                              >
                                {billType === "debt" && bill.debtType
                                  ? DEBT_TYPES.find((d) => d.value === bill.debtType)?.label?.toUpperCase() || "DEBT"
                                  : billType.toUpperCase()}
                              </span>
                            );
                          })()}
                          <span>{bill.name}</span>
                          {bill.isAutoPay && (
                            <span class="badge bg-accent-green/20 text-accent-green border-accent-green/40 badge-xs font-mono">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div class="text-sm text-theme-secondary font-mono">
                          {categories.find((c) => c.id === bill.categoryId)
                            ?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td class="font-semibold text-theme-primary font-mono">
                        <div>{formatCurrency(bill.amount)}</div>
                        {/* Show debt metrics if applicable */}
                        {bill.billType === "debt" && (
                          <div class="flex flex-col gap-0.5">
                            {bill.totalBalance != null && (
                              <div class="text-xs text-accent-orange font-mono">
                                BAL: {formatCurrency(bill.totalBalance)}
                              </div>
                            )}
                            {bill.interestRate != null && (
                              <div class="text-xs text-accent-orange/70 font-mono">
                                APR: {bill.interestRate}%
                              </div>
                            )}
                            {getPayoffDate(bill) && (
                              <div class="text-xs text-accent-green font-mono">
                                PAYOFF: {getPayoffDate(bill)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td class="hidden sm:table-cell text-theme-secondary font-mono">
                        Day {bill.dueDay}
                      </td>
                      <td class="hidden md:table-cell text-theme-secondary font-mono">
                        {FREQUENCIES.find((f) => f.value === bill.frequency)
                          ?.label}
                      </td>
                      <td class="text-sm hidden lg:table-cell text-theme-secondary font-mono">
                        {bill.lastPaidDate
                          ? new Date(bill.lastPaidDate).toLocaleDateString()
                          : <span class="text-theme-muted italic">Never</span>}
                      </td>
                      <td class="text-sm text-theme-secondary font-mono">
                        {bill.nextDueDate
                          ? new Date(bill.nextDueDate).toLocaleDateString()
                          : <span class="text-theme-muted italic">-</span>}
                      </td>
                      <td class="hidden sm:table-cell">
                        <span
                          class={`badge ${
                            status.class === "badge-error"
                              ? "badge-error"
                              : status.class === "badge-warning"
                              ? "bg-accent-orange/20 text-accent-orange border-accent-orange/40"
                              : status.class === "badge-info"
                              ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40"
                              : "bg-theme-tertiary text-theme-secondary border-theme"
                          } font-mono badge-xs`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-1 flex-wrap">
                          <button
                            type="button"
                            class="btn bg-accent-green/20 hover:bg-accent-green/30 border-accent-green text-accent-green btn-xs min-h-[36px] font-mono"
                            onClick={() => markPaid(bill)}
                            disabled={markingPaidId.value === bill.id}
                            aria-label={`Mark ${bill.name} as paid`}
                          >
                            {markingPaidId.value === bill.id
                              ? (
                                <span class="loading loading-spinner loading-xs">
                                </span>
                              )
                              : (
                                <>
                                  <span class="mr-1">✓</span>Paid
                                </>
                              )}
                          </button>
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs min-h-[36px] border border-theme hover:border-accent-cyan text-theme-secondary hover:text-accent-cyan font-mono"
                            onClick={() => openEditModal(bill)}
                            aria-label={`Edit ${bill.name}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs min-h-[36px] min-w-[36px] text-red-400 hover:text-red-300"
                            onClick={() => deleteBill(bill)}
                            aria-label={`Delete ${bill.name}`}
                          >
                            <span class="text-lg">×</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-theme-secondary border border-theme">
            <h3 class="font-bold text-lg mb-4">
              {editingBill.value ? "Edit Bill" : "Add Bill"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="grid grid-cols-2 gap-4">
                {/* Bill Type Selector */}
                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-theme-secondary">TYPE</span>
                  </label>
                  <div class="flex gap-2">
                    {BILL_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        class={`btn btn-sm flex-1 font-mono ${
                          formBillType.value === type.value
                            ? `border-2`
                            : "btn-ghost border border-theme"
                        }`}
                        style={formBillType.value === type.value
                          ? { borderColor: type.color, color: type.color, backgroundColor: `${type.color}20` }
                          : {}}
                        onClick={() => formBillType.value = type.value}
                      >
                        {type.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Debt Type Selector (only shown when billType is 'debt') */}
                {formBillType.value === "debt" && (
                  <div class="form-control col-span-2">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-theme-secondary">DEBT TYPE</span>
                    </label>
                    <select
                      class="select select-bordered bg-theme-tertiary border-theme text-theme-primary"
                      value={formDebtType.value}
                      onChange={(e) => formDebtType.value = e.currentTarget.value as DebtType}
                    >
                      <option value="">Select Debt Type</option>
                      {DEBT_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text">Bill Name</span>
                  </label>
                  <input
                    type="text"
                    class="input input-bordered"
                    value={formName.value}
                    onInput={(e) => formName.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">{formBillType.value === "debt" ? "Payment Amount" : "Amount"}</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered"
                    value={formAmount.value}
                    onInput={(e) => formAmount.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Due Day</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    class="input input-bordered"
                    value={formDueDay.value}
                    onInput={(e) => formDueDay.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Frequency</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={formFrequency.value}
                    onChange={(e) =>
                      formFrequency.value = e.currentTarget.value}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Category</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={formCategoryId.value}
                    onChange={(e) =>
                      formCategoryId.value = e.currentTarget.value}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Reminder Days</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    class="input input-bordered"
                    value={formReminderDays.value}
                    onInput={(e) =>
                      formReminderDays.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <span class="label-text">Auto-Pay</span>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-primary"
                      checked={formIsAutoPay.value}
                      onChange={(e) =>
                        formIsAutoPay.value = e.currentTarget.checked}
                    />
                  </label>
                </div>

                {/* Debt-specific fields (only shown when billType is 'debt') */}
                {formBillType.value === "debt" && (
                  <>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-mono text-xs text-accent-orange">TOTAL BALANCE</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        class="input input-bordered bg-theme-tertiary border-accent-orange/50"
                        placeholder="0.00"
                        value={formTotalBalance.value}
                        onInput={(e) => formTotalBalance.value = e.currentTarget.value}
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-mono text-xs text-accent-orange">INTEREST RATE (%)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        class="input input-bordered bg-theme-tertiary border-accent-orange/50"
                        placeholder="0.00"
                        value={formInterestRate.value}
                        onInput={(e) => formInterestRate.value = e.currentTarget.value}
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-mono text-xs text-accent-orange">MINIMUM PAYMENT</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        class="input input-bordered bg-theme-tertiary border-accent-orange/50"
                        placeholder="0.00"
                        value={formMinimumPayment.value}
                        onInput={(e) => formMinimumPayment.value = e.currentTarget.value}
                      />
                    </div>
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-mono text-xs text-accent-orange">ORIGINAL AMOUNT</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        class="input input-bordered bg-theme-tertiary border-accent-orange/50"
                        placeholder="0.00"
                        value={formOriginalAmount.value}
                        onInput={(e) => formOriginalAmount.value = e.currentTarget.value}
                      />
                    </div>
                  </>
                )}

                <div class="form-control col-span-2">
                  <label class="label">
                    <span class="label-text">Notes</span>
                  </label>
                  <textarea
                    class="textarea textarea-bordered"
                    value={formNotes.value}
                    onInput={(e) => formNotes.value = e.currentTarget.value}
                  >
                  </textarea>
                </div>
              </div>
              <div class="modal-action">
                <button
                  type="button"
                  class="btn btn-ghost"
                  onClick={() => isModalOpen.value = false}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn bg-accent-cyan/20 border-accent-cyan text-accent-cyan hover:bg-accent-cyan/30"
                  disabled={isSubmitting.value}
                >
                  {isSubmitting.value
                    ? <span class="loading loading-spinner loading-sm"></span>
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isModalOpen.value = false}>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillsManager(props: Props) {
  return (
    <ErrorBoundary>
      <BillsManagerContent {...props} />
    </ErrorBoundary>
  );
}

import { useSignal } from "@preact/signals";
import type { Category, CategoryGroup, PayPeriod } from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

interface Props {
  currentPeriod: PayPeriod | null;
  allPeriods: PayPeriod[];
  categories: CategoryGroup[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function SettingsManagerContent(
  { currentPeriod, allPeriods, categories: initialCategories }: Props,
) {
  const periods = useSignal<PayPeriod[]>(allPeriods);
  const categories = useSignal<CategoryGroup[]>(initialCategories);
  const isPeriodModalOpen = useSignal(false);
  const isEditPeriodModalOpen = useSignal(false);
  const isIncomeModalOpen = useSignal(false);
  const isSubmitting = useSignal(false);
  const editingPeriodKey = useSignal<string | null>(null);

  // Period form
  const periodName = useSignal("");
  const periodStart = useSignal("");
  const periodEnd = useSignal("");
  const periodExpectedIncome = useSignal("");

  // Income form
  const incomeDescription = useSignal("");
  const incomeAmount = useSignal("");
  const incomeDate = useSignal(new Date().toISOString().split("T")[0]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();

  // Format date as "Month Year" (e.g., "January 2024")
  const formatMonthYear = (date: Date) =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(
      date,
    );

  const toUtcMidnight = (date: Date) =>
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

  const getPeriodLengthDays = (period?: PayPeriod | null) => {
    if (!period?.startDate || !period?.endDate) return 14;
    const start = toUtcMidnight(new Date(period.startDate));
    const end = toUtcMidnight(new Date(period.endDate));
    const diffDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
    return Math.max(1, diffDays + 1);
  };

  const getLatestPeriod = () => {
    let latest: PayPeriod | null = null;
    for (const period of periods.value) {
      if (!period.endDate) continue;
      if (!latest) {
        latest = period;
        continue;
      }
      if (new Date(period.endDate) > new Date(latest.endDate)) {
        latest = period;
      }
    }
    return latest;
  };

  const openPeriodModal = () => {
    const latestPeriod = getLatestPeriod();
    const periodLengthDays = getPeriodLengthDays(currentPeriod ?? latestPeriod);
    const baseDate = latestPeriod?.endDate
      ? new Date(latestPeriod.endDate)
      : new Date();
    const startDate = toUtcMidnight(baseDate);
    startDate.setUTCDate(startDate.getUTCDate() + 1);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + periodLengthDays - 1);
    periodName.value = formatMonthYear(
      new Date(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    periodStart.value = startDate.toISOString().split("T")[0];
    periodEnd.value = endDate.toISOString().split("T")[0];
    periodExpectedIncome.value = "";
    isPeriodModalOpen.value = true;
  };

  const openEditPeriodModal = (period: PayPeriod) => {
    if (!period.key) return;
    editingPeriodKey.value = period.key;
    periodName.value = period.name;
    periodStart.value = new Date(period.startDate).toISOString().split("T")[0];
    periodEnd.value = new Date(period.endDate).toISOString().split("T")[0];
    periodExpectedIncome.value = String(period.expectedIncome ?? 0);
    isEditPeriodModalOpen.value = true;
  };

  const createPeriod = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;
    try {
      const res = await fetch(`${API_BASE}/pay-periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: "default",
          name: periodName.value,
          startDate: periodStart.value,
          endDate: periodEnd.value,
          expectedIncome: parseFloat(periodExpectedIncome.value) || 0,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        periods.value = [...periods.value, created];
        isPeriodModalOpen.value = false;
        toast.success(`Period "${periodName.value}" created`);
      } else {
        toast.error("Failed to create period");
      }
    } catch (error) {
      console.error("Error creating period:", error);
      toast.error("Error creating period");
    } finally {
      isSubmitting.value = false;
    }
  };

  const deletePeriod = async (period: PayPeriod) => {
    if (!period.key) return;
    if (currentPeriod?.key && period.key === currentPeriod.key) return;

    const ok = globalThis.confirm(
      `Delete pay period "${period.name}"? This will also delete assignments, carryovers, income entries, and transactions for that period.`,
    );
    if (!ok) return;

    isSubmitting.value = true;
    try {
      const periodKey = encodeURIComponent(period.key.trim());
      const res = await fetch(`${API_BASE}/pay-periods/${periodKey}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        toast.success("Period deleted");
        globalThis.location?.reload();
        return;
      }

      toast.error("Delete pay period failed");
      console.error(
        "Delete pay period failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error deleting period:", error);
      toast.error("Error deleting period");
    } finally {
      isSubmitting.value = false;
    }
  };

  const updatePeriod = async (e: Event) => {
    e.preventDefault();
    if (!editingPeriodKey.value) return;
    isSubmitting.value = true;
    try {
      const periodKey = encodeURIComponent(editingPeriodKey.value.trim());
      const res = await fetch(`${API_BASE}/pay-periods/${periodKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodName.value,
          startDate: periodStart.value,
          endDate: periodEnd.value,
          expectedIncome: parseFloat(periodExpectedIncome.value) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Period updated");
        isEditPeriodModalOpen.value = false;
        globalThis.location?.reload();
        return;
      }

      toast.error("Update pay period failed");
      console.error(
        "Update pay period failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error updating period:", error);
      toast.error("Error updating period");
    } finally {
      isSubmitting.value = false;
    }
  };

  const closePeriod = async () => {
    if (!currentPeriod?.key) return;
    if (currentPeriod.isClosed) {
      toast.warning("This period is already closed.");
      return;
    }

    // Fetch budget summary to check for unassigned funds
    try {
      const summaryRes = await fetch(
        `${API_BASE}/pay-periods/${
          encodeURIComponent(currentPeriod.key)
        }/summary`,
      );
      if (summaryRes.ok) {
        const summary = await summaryRes.json();

        if (summary.unassigned > 0) {
          const proceed = globalThis.confirm(
            `This period has $${
              summary.unassigned.toFixed(2)
            } unassigned. Are you sure you want to close it without assigning all funds?`,
          );
          if (!proceed) return;
        } else if (summary.unassigned < 0) {
          toast.error(
            `Cannot close period: You have over-assigned by $${
              Math.abs(summary.unassigned).toFixed(2)
            }.`,
          );
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching budget summary:", error);
    }

    const ok = globalThis.confirm(
      `Close "${currentPeriod.name}"? This will mark the period as closed and propagate carryovers to future periods.`,
    );
    if (!ok) return;

    isSubmitting.value = true;
    try {
      const periodKey = encodeURIComponent(currentPeriod.key.trim());

      // Mark period as closed
      const updateRes = await fetch(`${API_BASE}/pay-periods/${periodKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentPeriod.name,
          startDate: currentPeriod.startDate,
          endDate: currentPeriod.endDate,
          expectedIncome: currentPeriod.expectedIncome,
          isClosed: true,
        }),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to close period");
      }

      // Recalculate year to propagate carryovers
      const recalcRes = await fetch(
        `${API_BASE}/pay-periods/${periodKey}/recalculate-year`,
        {
          method: "POST",
        },
      );

      if (!recalcRes.ok) {
        console.warn("Recalculate year failed but period was closed");
      }

      toast.success("Period closed successfully");
      // Reload to show updated state
      globalThis.location?.reload();
    } catch (error) {
      console.error("Error closing period:", error);
      toast.error("Failed to close period. Please try again.");
    } finally {
      isSubmitting.value = false;
    }
  };

  const recalculateYear = async () => {
    if (!currentPeriod?.key) return;
    isSubmitting.value = true;
    try {
      const periodKey = encodeURIComponent(currentPeriod.key.trim());
      const res = await fetch(
        `${API_BASE}/pay-periods/${periodKey}/recalculate-year`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        toast.success("Yearly recalculation complete");
        globalThis.location?.reload();
        return;
      }

      toast.error("Recalculate year failed");
      console.error(
        "Recalculate year failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error recalculating year:", error);
      toast.error("Error recalculating year");
    } finally {
      isSubmitting.value = false;
    }
  };

  const openIncomeModal = () => {
    incomeDescription.value = "Paycheck";
    incomeAmount.value = "";
    incomeDate.value = new Date().toISOString().split("T")[0];
    isIncomeModalOpen.value = true;
  };

  const addIncome = async (e: Event) => {
    e.preventDefault();
    if (!currentPeriod?.key) return;
    isSubmitting.value = true;
    try {
      const res = await fetch(`${API_BASE}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriodKey: currentPeriod.key,
          description: incomeDescription.value,
          amount: parseFloat(incomeAmount.value) || 0,
          receivedDate: incomeDate.value,
        }),
      });
      if (res.ok) {
        toast.success(`Income "${incomeDescription.value}" added`);
        isIncomeModalOpen.value = false;
        // Refresh page to show updated income
        globalThis.location?.reload();
      } else {
        toast.error("Failed to add income");
      }
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Error adding income");
    } finally {
      isSubmitting.value = false;
    }
  };

  return (
    <div class="space-y-6">
      {/* Current Period */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-4 md:p-6">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 class="text-lg font-bold text-white font-mono">
              📅 CURRENT BUDGET PERIOD
            </h2>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn bg-[#00ff88]/20 hover:bg-[#00ff88]/30 border border-[#00ff88] text-[#00ff88] btn-sm min-h-[36px] font-mono"
                onClick={openIncomeModal}
              >
                + INCOME
              </button>
              {currentPeriod && !currentPeriod.isClosed && (
                <button
                  type="button"
                  class="btn bg-[#ffb000]/20 hover:bg-[#ffb000]/30 border border-[#ffb000] text-[#ffb000] btn-sm min-h-[36px] font-mono"
                  onClick={closePeriod}
                  disabled={isSubmitting.value}
                >
                  CLOSE PERIOD
                </button>
              )}
              <button
                type="button"
                class="btn btn-ghost btn-sm min-h-[36px] border border-[#333] hover:border-white text-[#888] hover:text-white font-mono"
                onClick={recalculateYear}
                disabled={isSubmitting.value || !currentPeriod?.key}
              >
                RECALC YEAR
              </button>
              <button
                type="button"
                class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] btn-sm min-h-[36px] font-mono"
                onClick={openPeriodModal}
              >
                + NEW PERIOD
              </button>
            </div>
          </div>

          {currentPeriod
            ? (
              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
                  <div class="stat-title text-[10px] text-[#888] font-mono">
                    PERIOD
                  </div>
                  <div class="stat-value text-base text-white font-mono">
                    {currentPeriod.name}
                  </div>
                  <div class="stat-desc text-[10px] text-[#666] font-mono">
                    {formatDate(currentPeriod.startDate)} -{" "}
                    {formatDate(currentPeriod.endDate)}
                  </div>
                </div>
                <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
                  <div class="stat-title text-[10px] text-[#888] font-mono">
                    EXPECTED INCOME
                  </div>
                  <div class="stat-value text-base text-[#00ff88] font-mono">
                    {formatCurrency(currentPeriod.expectedIncome)}
                  </div>
                </div>
                <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
                  <div class="stat-title text-[10px] text-[#888] font-mono">
                    STATUS
                  </div>
                  <div class="stat-value pt-1">
                    {currentPeriod.isClosed
                      ? (
                        <span class="badge badge-error border-red-500/50 font-mono badge-xs">
                          CLOSED
                        </span>
                      )
                      : (
                        <span class="badge bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40 font-mono badge-xs">
                          ACTIVE
                        </span>
                      )}
                  </div>
                </div>
              </div>
            )
            : (
              <div class="alert bg-[#ffb000]/10 border border-[#ffb000]/30 mt-4">
                <span class="text-[#ffb000] font-mono text-xs">
                  NO ACTIVE BUDGET PERIOD. CREATE ONE TO START BUDGETING.
                </span>
              </div>
            )}
        </div>
      </div>

      {/* All Periods */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-0">
          <div class="px-4 md:px-6 py-4 border-b border-[#333]">
            <h2 class="text-lg font-bold text-white font-mono">
              📋 ALL BUDGET PERIODS
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                  <th class="text-[#888] font-mono text-xs">NAME</th>
                  <th class="text-[#888] font-mono text-xs">START</th>
                  <th class="text-[#888] font-mono text-xs">END</th>
                  <th class="text-[#888] font-mono text-xs">EXPECTED</th>
                  <th class="text-[#888] font-mono text-xs">STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.value.map((period) => (
                  <tr
                    key={period.key ?? period.id}
                    class={`border-b border-[#333] hover:bg-[#1a1a1a] ${
                      (period.key && currentPeriod?.key &&
                          period.key === currentPeriod.key)
                        ? "bg-[#00d9ff]/5"
                        : ""
                    }`}
                  >
                    <td class="font-bold text-white font-mono">
                      {period.name}
                    </td>
                    <td class="text-[#888] font-mono">
                      {formatDate(period.startDate)}
                    </td>
                    <td class="text-[#888] font-mono">
                      {formatDate(period.endDate)}
                    </td>
                    <td class="text-[#00ff88] font-mono">
                      {formatCurrency(period.expectedIncome)}
                    </td>
                    <td>
                      {period.isClosed
                        ? (
                          <span class="badge bg-[#333] text-[#666] border-[#444] font-mono badge-xs">
                            CLOSED
                          </span>
                        )
                        : period.key && currentPeriod?.key &&
                            period.key === currentPeriod.key
                        ? (
                          <span class="badge bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/40 font-mono badge-xs">
                            CURRENT
                          </span>
                        )
                        : (
                          <span class="badge bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40 font-mono badge-xs">
                            UPCOMING
                          </span>
                        )}
                    </td>
                    <td>
                      {(() => {
                        const isCurrent = !!(period.key && currentPeriod?.key &&
                          period.key === currentPeriod.key);
                        const canDelete = !!period.key && !isSubmitting.value &&
                          !isCurrent;

                        return (
                          <div class="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs min-h-[32px] border border-[#333] hover:border-[#00d9ff] text-[#888] hover:text-[#00d9ff] font-mono"
                              onClick={() => openEditPeriodModal(period)}
                              disabled={!period.key}
                            >
                              EDIT
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs min-h-[32px] border border-[#333] hover:border-red-500 text-[#888] hover:text-red-500 font-mono"
                              onClick={() => deletePeriod(period)}
                              disabled={!canDelete}
                            >
                              DELETE
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-4 md:p-6">
          <h2 class="text-lg font-bold text-white font-mono mb-2">
            📁 BUDGET CATEGORIES
          </h2>
          <p class="text-[#666] text-xs mb-6 font-mono uppercase tracking-wider">
            SYSTEM CATEGORIES AND GROUPS
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.value.map((group) => (
              <div
                key={group.id}
                class="bg-[#0a0a0a] border border-[#333] rounded p-4"
              >
                <h3 class="font-bold text-[#00d9ff] font-mono text-xs mb-3 border-b border-[#333] pb-2">
                  {group.name.toUpperCase()}
                </h3>
                <div class="flex flex-wrap gap-2">
                  {group.categories.map((cat: Category) => (
                    <div
                      key={cat.id}
                      class="badge bg-[#1a1a1a] text-[#888] border-[#333] font-mono text-[10px] h-auto py-1"
                    >
                      {cat.name.toUpperCase()}
                      <span class="ml-2 text-[#00ff88]">
                        {formatCurrency(cat.targetAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Period Modal */}
      {isPeriodModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] shadow-2xl">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              CREATE BUDGET PERIOD
            </h3>
            <form onSubmit={createPeriod}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    PERIOD NAME
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  value={periodName.value}
                  onInput={(e) => periodName.value = e.currentTarget.value}
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      START DATE
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={periodStart.value}
                    onInput={(e) => periodStart.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      END DATE
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={periodEnd.value}
                    onInput={(e) => periodEnd.value = e.currentTarget.value}
                    required
                  />
                </div>
              </div>
              <div class="form-control mt-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    EXPECTED INCOME
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  placeholder="0.00"
                  value={periodExpectedIncome.value}
                  onInput={(e) =>
                    periodExpectedIncome.value = e.currentTarget.value}
                />
              </div>
              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={() => isPeriodModalOpen.value = false}
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
                    : "CREATE"}
                </button>
              </div>
            </form>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isPeriodModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {isEditPeriodModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] shadow-2xl">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              EDIT BUDGET PERIOD
            </h3>
            <form onSubmit={updatePeriod}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    PERIOD NAME
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  value={periodName.value}
                  onInput={(e) => periodName.value = e.currentTarget.value}
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      START DATE
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={periodStart.value}
                    onInput={(e) => periodStart.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      END DATE
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={periodEnd.value}
                    onInput={(e) => periodEnd.value = e.currentTarget.value}
                    required
                  />
                </div>
              </div>
              <div class="form-control mt-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    EXPECTED INCOME
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  placeholder="0.00"
                  value={periodExpectedIncome.value}
                  onInput={(e) =>
                    periodExpectedIncome.value = e.currentTarget.value}
                />
              </div>
              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={() => isEditPeriodModalOpen.value = false}
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
                    : "SAVE"}
                </button>
              </div>
            </form>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isEditPeriodModalOpen.value = false}
          >
          </div>
        </div>
      )}

      {/* Income Modal */}
      {isIncomeModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-[#1a1a1a] border border-[#333] shadow-2xl">
            <h3 class="font-bold text-lg mb-4 text-[#00ff88] font-mono">
              ADD INCOME
            </h3>
            <form onSubmit={addIncome}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    DESCRIPTION
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                  placeholder="e.g., PAYCHECK, SIDE GIG"
                  value={incomeDescription.value}
                  onInput={(e) =>
                    incomeDescription.value = e.currentTarget.value}
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      AMOUNT
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    placeholder="0.00"
                    value={incomeAmount.value}
                    onInput={(e) => incomeAmount.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      DATE RECEIVED
                    </span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered bg-[#0a0a0a] border-[#333] text-white font-mono"
                    value={incomeDate.value}
                    onInput={(e) => incomeDate.value = e.currentTarget.value}
                    required
                  />
                </div>
              </div>
              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={() => isIncomeModalOpen.value = false}
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
                    : "ADD INCOME"}
                </button>
              </div>
            </form>
          </div>
          <div
            class="modal-backdrop"
            onClick={() => isIncomeModalOpen.value = false}
          >
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsManager(props: Props) {
  return (
    <ErrorBoundary>
      <SettingsManagerContent {...props} />
    </ErrorBoundary>
  );
}

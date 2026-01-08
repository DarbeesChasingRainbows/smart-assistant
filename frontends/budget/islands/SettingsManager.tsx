import { useSignal } from "@preact/signals";
import type { PayPeriod, CategoryGroup, Category } from "../types/api.ts";

interface Props {
  currentPeriod: PayPeriod | null;
  allPeriods: PayPeriod[];
  categories: CategoryGroup[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

export default function SettingsManager({ currentPeriod, allPeriods, categories: initialCategories }: Props) {
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
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const openPeriodModal = () => {
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    periodName.value = `Pay Period ${today.toLocaleDateString()}`;
    periodStart.value = today.toISOString().split("T")[0];
    periodEnd.value = twoWeeksLater.toISOString().split("T")[0];
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
      }
    } catch (error) {
      console.error("Error creating period:", error);
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
        globalThis.location?.reload();
        return;
      }

      console.error(
        "Delete pay period failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error deleting period:", error);
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
        isEditPeriodModalOpen.value = false;
        globalThis.location?.reload();
        return;
      }

      console.error(
        "Update pay period failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error updating period:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const recalculateYear = async () => {
    if (!currentPeriod?.key) return;
    isSubmitting.value = true;
    try {
      const periodKey = encodeURIComponent(currentPeriod.key.trim());
      const res = await fetch(`${API_BASE}/pay-periods/${periodKey}/recalculate-year`, {
        method: "POST",
      });

      if (res.ok) {
        globalThis.location?.reload();
        return;
      }

      console.error(
        "Recalculate year failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (error) {
      console.error("Error recalculating year:", error);
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
      await fetch(`${API_BASE}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriodKey: currentPeriod.key,
          description: incomeDescription.value,
          amount: parseFloat(incomeAmount.value) || 0,
          receivedDate: incomeDate.value,
        }),
      });
      isIncomeModalOpen.value = false;
      // Refresh page to show updated income
      globalThis.location?.reload();
    } catch (error) {
      console.error("Error adding income:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  return (
    <div class="space-y-6">
      {/* Current Period */}
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center">
            <h2 class="card-title text-xl">📅 Current Budget Period</h2>
            <div class="flex gap-2">
              <button type="button" class="btn btn-success btn-sm" onClick={openIncomeModal}>
                + Add Income
              </button>
              <button type="button" class="btn btn-outline btn-sm" onClick={recalculateYear} disabled={isSubmitting.value || !currentPeriod?.key}>
                Recalculate Year
              </button>
              <button type="button" class="btn btn-primary btn-sm" onClick={openPeriodModal}>
                + New Period
              </button>
            </div>
          </div>
          
          {currentPeriod ? (
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="stat bg-slate-50 rounded-lg">
                <div class="stat-title">Period</div>
                <div class="stat-value text-lg">{currentPeriod.name}</div>
                <div class="stat-desc">
                  {formatDate(currentPeriod.startDate)} - {formatDate(currentPeriod.endDate)}
                </div>
              </div>
              <div class="stat bg-green-50 rounded-lg">
                <div class="stat-title">Expected Income</div>
                <div class="stat-value text-lg text-green-600">
                  {formatCurrency(currentPeriod.expectedIncome)}
                </div>
              </div>
              <div class="stat bg-blue-50 rounded-lg">
                <div class="stat-title">Status</div>
                <div class="stat-value text-lg">
                  {currentPeriod.isClosed ? (
                    <span class="badge badge-error">Closed</span>
                  ) : (
                    <span class="badge badge-success">Active</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div class="alert alert-warning mt-4">
              <span>No active budget period. Create one to start budgeting!</span>
            </div>
          )}
        </div>
      </div>

      {/* All Periods */}
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl">📋 All Budget Periods</h2>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Expected</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.value.map((period) => (
                  <tr
                    key={period.key ?? period.id}
                    class={(period.key && currentPeriod?.key && period.key === currentPeriod.key)
                      ? "bg-blue-50"
                      : ""}
                  >
                    <td class="font-medium">{period.name}</td>
                    <td>{formatDate(period.startDate)}</td>
                    <td>{formatDate(period.endDate)}</td>
                    <td>{formatCurrency(period.expectedIncome)}</td>
                    <td>
                      {period.isClosed ? (
                        <span class="badge badge-ghost badge-sm">Closed</span>
                      ) : period.key && currentPeriod?.key && period.key === currentPeriod.key ? (
                        <span class="badge badge-success badge-sm">Current</span>
                      ) : (
                        <span class="badge badge-warning badge-sm">Upcoming</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const isCurrent = !!(period.key && currentPeriod?.key && period.key === currentPeriod.key);
                        const canDelete = !!period.key && !isSubmitting.value && !isCurrent;

                        return (
                      <div class="flex items-center justify-end gap-2">
                        <button type="button" class="btn btn-ghost btn-xs" onClick={() => openEditPeriodModal(period)} disabled={!period.key}>
                          Edit
                        </button>
                        <button
                          type="button"
                          class="btn btn-error btn-outline btn-xs"
                          onClick={() => deletePeriod(period)}
                          disabled={!canDelete}
                        >
                          Delete
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
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-xl">📁 Budget Categories</h2>
          <p class="text-slate-500 text-sm mb-4">
            Drag and drop to reorder categories (coming soon)
          </p>
          <div class="space-y-4">
            {categories.value.map((group) => (
              <div key={group.id} class="border rounded-lg p-4">
                <h3 class="font-semibold text-slate-700 mb-2">{group.name}</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {group.categories.map((cat: Category) => (
                    <div key={cat.id} class="badge badge-lg badge-ghost">
                      {cat.name}
                      <span class="ml-2 text-xs text-slate-400">
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
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Create Budget Period</h3>
            <form onSubmit={createPeriod}>
              <div class="form-control mb-4">
                <label class="label"><span class="label-text">Period Name</span></label>
                <input type="text" class="input input-bordered" value={periodName.value} onInput={(e) => periodName.value = e.currentTarget.value} required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Start Date</span></label>
                  <input type="date" class="input input-bordered" value={periodStart.value} onInput={(e) => periodStart.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">End Date</span></label>
                  <input type="date" class="input input-bordered" value={periodEnd.value} onInput={(e) => periodEnd.value = e.currentTarget.value} required />
                </div>
              </div>
              <div class="form-control mt-4">
                <label class="label"><span class="label-text">Expected Income</span></label>
                <input type="number" step="0.01" class="input input-bordered" placeholder="0.00" value={periodExpectedIncome.value} onInput={(e) => periodExpectedIncome.value = e.currentTarget.value} />
              </div>
              <div class="modal-action">
                <button type="button" class="btn" onClick={() => isPeriodModalOpen.value = false}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={isSubmitting.value}>
                  {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Create"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isPeriodModalOpen.value = false}></div>
        </div>
      )}

      {/* Edit Period Modal */}
      {isEditPeriodModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Edit Budget Period</h3>
            <form onSubmit={updatePeriod}>
              <div class="form-control mb-4">
                <label class="label"><span class="label-text">Period Name</span></label>
                <input type="text" class="input input-bordered" value={periodName.value} onInput={(e) => periodName.value = e.currentTarget.value} required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Start Date</span></label>
                  <input type="date" class="input input-bordered" value={periodStart.value} onInput={(e) => periodStart.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">End Date</span></label>
                  <input type="date" class="input input-bordered" value={periodEnd.value} onInput={(e) => periodEnd.value = e.currentTarget.value} required />
                </div>
              </div>
              <div class="form-control mt-4">
                <label class="label"><span class="label-text">Expected Income</span></label>
                <input type="number" step="0.01" class="input input-bordered" placeholder="0.00" value={periodExpectedIncome.value} onInput={(e) => periodExpectedIncome.value = e.currentTarget.value} />
              </div>
              <div class="modal-action">
                <button type="button" class="btn" onClick={() => isEditPeriodModalOpen.value = false}>Cancel</button>
                <button type="submit" class="btn btn-primary" disabled={isSubmitting.value}>
                  {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Save"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isEditPeriodModalOpen.value = false}></div>
        </div>
      )}

      {/* Income Modal */}
      {isIncomeModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">Add Income</h3>
            <form onSubmit={addIncome}>
              <div class="form-control mb-4">
                <label class="label"><span class="label-text">Description</span></label>
                <input type="text" class="input input-bordered" placeholder="e.g., Paycheck, Side Gig" value={incomeDescription.value} onInput={(e) => incomeDescription.value = e.currentTarget.value} required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Amount</span></label>
                  <input type="number" step="0.01" class="input input-bordered" placeholder="0.00" value={incomeAmount.value} onInput={(e) => incomeAmount.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Date Received</span></label>
                  <input type="date" class="input input-bordered" value={incomeDate.value} onInput={(e) => incomeDate.value = e.currentTarget.value} required />
                </div>
              </div>
              <div class="modal-action">
                <button type="button" class="btn" onClick={() => isIncomeModalOpen.value = false}>Cancel</button>
                <button type="submit" class="btn btn-success" disabled={isSubmitting.value}>
                  {isSubmitting.value ? <span class="loading loading-spinner loading-sm"></span> : "Add Income"}
                </button>
              </div>
            </form>
          </div>
          <div class="modal-backdrop" onClick={() => isIncomeModalOpen.value = false}></div>
        </div>
      )}
    </div>
  );
}

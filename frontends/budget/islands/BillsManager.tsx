import { useSignal } from "@preact/signals";
import type { Bill, Category } from "../types/api.ts";
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

  return (
    <div class="space-y-4 md:space-y-6">
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-4 md:p-6">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 class="text-sm md:text-lg text-[#888] font-mono">
                MONTHLY BILLS TOTAL
              </h2>
              <div class="text-2xl md:text-3xl font-bold text-white font-mono">
                {formatCurrency(totalMonthly())}
              </div>
            </div>
            <button
              type="button"
              class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
              onClick={openAddModal}
            >
              <span class="mr-2">+</span>Add Bill
            </button>
          </div>
        </div>
      </div>

      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                  <th class="text-[#888] font-mono text-xs">BILL</th>
                  <th class="text-[#888] font-mono text-xs">AMOUNT</th>
                  <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                    DUE DAY
                  </th>
                  <th class="text-[#888] font-mono text-xs hidden md:table-cell">
                    FREQUENCY
                  </th>
                  <th class="text-[#888] font-mono text-xs hidden lg:table-cell">
                    LAST PAID
                  </th>
                  <th class="text-[#888] font-mono text-xs">NEXT DUE</th>
                  <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                    STATUS
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.value.filter((b) => b.isActive).map((bill) => {
                  const status = getDueStatus(bill);
                  return (
                    <tr
                      key={bill.id}
                      class="border-b border-[#333] hover:bg-[#1a1a1a]"
                    >
                      <td>
                        <div class="font-medium flex items-center gap-2 flex-wrap text-white">
                          <span>{bill.name}</span>
                          {bill.isAutoPay && (
                            <span class="badge bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40 badge-xs font-mono">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div class="text-sm text-[#888] font-mono">
                          {categories.find((c) => c.id === bill.categoryId)
                            ?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td class="font-semibold text-white font-mono">
                        {formatCurrency(bill.amount)}
                      </td>
                      <td class="hidden sm:table-cell text-[#888] font-mono">
                        Day {bill.dueDay}
                      </td>
                      <td class="hidden md:table-cell text-[#888] font-mono">
                        {FREQUENCIES.find((f) => f.value === bill.frequency)
                          ?.label}
                      </td>
                      <td class="text-sm hidden lg:table-cell text-[#888] font-mono">
                        {bill.lastPaidDate
                          ? new Date(bill.lastPaidDate).toLocaleDateString()
                          : <span class="text-[#888] italic">Never</span>}
                      </td>
                      <td class="text-sm text-[#888] font-mono">
                        {bill.nextDueDate
                          ? new Date(bill.nextDueDate).toLocaleDateString()
                          : <span class="text-[#888] italic">-</span>}
                      </td>
                      <td class="hidden sm:table-cell">
                        <span
                          class={`badge ${
                            status.class === "badge-error"
                              ? "badge-error"
                              : status.class === "badge-warning"
                              ? "bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40"
                              : status.class === "badge-info"
                              ? "bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/40"
                              : "bg-[#333] text-[#888] border-[#444]"
                          } font-mono badge-xs`}
                        >
                          {status.text}
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-1 flex-wrap">
                          <button
                            type="button"
                            class="btn bg-[#00ff88]/20 hover:bg-[#00ff88]/30 border-[#00ff88] text-[#00ff88] btn-xs min-h-[36px] font-mono"
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
                            class="btn btn-ghost btn-xs min-h-[36px] border border-[#333] hover:border-[#00d9ff] text-[#888] hover:text-[#00d9ff] font-mono"
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
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">
              {editingBill.value ? "Edit Bill" : "Add Bill"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="grid grid-cols-2 gap-4">
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
                    <span class="label-text">Amount</span>
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

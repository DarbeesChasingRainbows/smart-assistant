import { useSignal } from "@preact/signals";
import type { Bill, Category } from "../types/api.ts";

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

export default function BillsManager({ initialBills, categories }: Props) {
  const bills = useSignal<Bill[]>(initialBills);
  const isModalOpen = useSignal(false);
  const editingBill = useSignal<Bill | null>(null);
  const isSubmitting = useSignal(false);

  const formName = useSignal("");
  const formAmount = useSignal("0");
  const formDueDay = useSignal("1");
  const formFrequency = useSignal("monthly");
  const formCategoryId = useSignal<string>("");
  const formIsAutoPay = useSignal(false);
  const formReminderDays = useSignal("3");
  const formNotes = useSignal("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const totalMonthly = () => {
    return bills.value.filter(b => b.isActive).reduce((sum, b) => {
      const monthly = b.frequency === "weekly" ? b.amount * 4.33 :
                      b.frequency === "biweekly" ? b.amount * 2.17 :
                      b.frequency === "quarterly" ? b.amount / 3 :
                      b.frequency === "yearly" ? b.amount / 12 : b.amount;
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
          bills.value = bills.value.map(b => b.id === updated.id ? updated : b);
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
        }
      }
      isModalOpen.value = false;
    } catch (error) {
      console.error("Error saving bill:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const markPaid = async (bill: Bill) => {
    try {
      await fetch(`${API_BASE}/bills/${bill.id}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidDate: new Date().toISOString().split("T")[0] }),
      });
      // Refresh bills
      const res = await fetch(`${API_BASE}/bills?activeOnly=false`);
      if (res.ok) bills.value = await res.json();
    } catch (error) {
      console.error("Error marking paid:", error);
    }
  };

  const deleteBill = async (bill: Bill) => {
    if (!confirm(`Delete "${bill.name}"?`)) return;
    try {
      await fetch(`${API_BASE}/bills/${bill.id}`, { method: "DELETE" });
      bills.value = bills.value.filter(b => b.id !== bill.id);
    } catch (error) {
      console.error("Error deleting bill:", error);
    }
  };

  const getDueStatus = (bill: Bill) => {
    if (!bill.nextDueDate) return { class: "badge-ghost", text: "No date" };
    const due = new Date(bill.nextDueDate);
    const today = new Date();
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { class: "badge-error", text: `${Math.abs(daysUntil)}d overdue` };
    if (daysUntil <= 3) return { class: "badge-warning", text: `${daysUntil}d` };
    if (daysUntil <= 7) return { class: "badge-info", text: `${daysUntil}d` };
    return { class: "badge-ghost", text: `${daysUntil}d` };
  };

  return (
    <div class="space-y-6">
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg text-slate-500">Monthly Bills Total</h2>
              <div class="text-3xl font-bold text-slate-800">{formatCurrency(totalMonthly())}</div>
            </div>
            <button type="button" class="btn btn-primary" onClick={openAddModal}>+ Add Bill</button>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Frequency</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.value.filter(b => b.isActive).map((bill) => {
                  const status = getDueStatus(bill);
                  return (
                    <tr key={bill.id}>
                      <td>
                        <div class="font-medium flex items-center gap-2">
                          {bill.name}
                          {bill.isAutoPay && <span class="badge badge-success badge-xs">Auto</span>}
                        </div>
                        <div class="text-sm text-slate-500">
                          {categories.find(c => c.id === bill.categoryId)?.name || "Uncategorized"}
                        </div>
                      </td>
                      <td class="font-semibold">{formatCurrency(bill.amount)}</td>
                      <td>
                        <span class={`badge ${status.class}`}>{status.text}</span>
                      </td>
                      <td>{FREQUENCIES.find(f => f.value === bill.frequency)?.label}</td>
                      <td>Day {bill.dueDay}</td>
                      <td>
                        <div class="flex gap-1">
                          <button type="button" class="btn btn-success btn-xs" onClick={() => markPaid(bill)}>Paid</button>
                          <button type="button" class="btn btn-ghost btn-xs" onClick={() => openEditModal(bill)}>Edit</button>
                          <button type="button" class="btn btn-ghost btn-xs text-error" onClick={() => deleteBill(bill)}>×</button>
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
            <h3 class="font-bold text-lg mb-4">{editingBill.value ? "Edit Bill" : "Add Bill"}</h3>
            <form onSubmit={handleSubmit}>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control col-span-2">
                  <label class="label"><span class="label-text">Bill Name</span></label>
                  <input type="text" class="input input-bordered" value={formName.value} onInput={(e) => formName.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Amount</span></label>
                  <input type="number" step="0.01" class="input input-bordered" value={formAmount.value} onInput={(e) => formAmount.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Due Day</span></label>
                  <input type="number" min="1" max="31" class="input input-bordered" value={formDueDay.value} onInput={(e) => formDueDay.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Frequency</span></label>
                  <select class="select select-bordered" value={formFrequency.value} onChange={(e) => formFrequency.value = e.currentTarget.value}>
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Category</span></label>
                  <select class="select select-bordered" value={formCategoryId.value} onChange={(e) => formCategoryId.value = e.currentTarget.value}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Reminder Days</span></label>
                  <input type="number" min="0" max="30" class="input input-bordered" value={formReminderDays.value} onInput={(e) => formReminderDays.value = e.currentTarget.value} />
                </div>
                <div class="form-control">
                  <label class="label cursor-pointer">
                    <span class="label-text">Auto-Pay</span>
                    <input type="checkbox" class="checkbox checkbox-primary" checked={formIsAutoPay.value} onChange={(e) => formIsAutoPay.value = e.currentTarget.checked} />
                  </label>
                </div>
                <div class="form-control col-span-2">
                  <label class="label"><span class="label-text">Notes</span></label>
                  <textarea class="textarea textarea-bordered" value={formNotes.value} onInput={(e) => formNotes.value = e.currentTarget.value}></textarea>
                </div>
              </div>
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
    </div>
  );
}

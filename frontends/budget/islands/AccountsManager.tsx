import { useSignal } from "@preact/signals";
import type { Account } from "../types/api.ts";

interface Props {
  initialAccounts: Account[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
];

export default function AccountsManager({ initialAccounts }: Props) {
  const accounts = useSignal<Account[]>(initialAccounts);
  const isModalOpen = useSignal(false);
  const editingAccount = useSignal<Account | null>(null);
  const isSubmitting = useSignal(false);

  // Form state
  const formName = useSignal("");
  const formType = useSignal("checking");
  const formInstitution = useSignal("");
  const formLastFour = useSignal("");
  const formBalance = useSignal("0");
  const formOnBudget = useSignal(true);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const totalBalance = () =>
    accounts.value.filter((a) => !a.isClosed).reduce(
      (sum, a) => sum + (a.currentBalance ?? 0),
      0,
    );

  const openAddModal = () => {
    editingAccount.value = null;
    formName.value = "";
    formType.value = "checking";
    formInstitution.value = "";
    formLastFour.value = "";
    formBalance.value = "0";
    formOnBudget.value = true;
    isModalOpen.value = true;
  };

  const openEditModal = (account: Account) => {
    editingAccount.value = account;
    formName.value = account.name ?? "";
    formType.value = account.accountType ?? "checking";
    formInstitution.value = account.institution || "";
    formLastFour.value = account.lastFour || "";
    formBalance.value = (account.currentBalance ?? 0).toString();
    formOnBudget.value = account.isOnBudget ?? true;
    isModalOpen.value = true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    try {
      if (editingAccount.value) {
        // Update existing
        const res = await fetch(
          `${API_BASE}/accounts/${editingAccount.value.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formName.value,
              institution: formInstitution.value || null,
              isOnBudget: formOnBudget.value,
            }),
          },
        );
        if (res.ok) {
          const updated = await res.json();
          accounts.value = accounts.value.map((a) =>
            a.id === updated.id ? updated : a
          );
        }
      } else {
        // Create new
        const res = await fetch(`${API_BASE}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.value,
            accountType: formType.value,
            institution: formInstitution.value || null,
            lastFour: formLastFour.value || null,
            initialBalance: parseFloat(formBalance.value) || 0,
            isOnBudget: formOnBudget.value,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          accounts.value = [...accounts.value, created];
        }
      }
      isModalOpen.value = false;
    } catch (error) {
      console.error("Error saving account:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const toggleClosed = async (account: Account) => {
    try {
      const res = await fetch(`${API_BASE}/accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isClosed: !account.isClosed }),
      });
      if (res.ok) {
        const updated = await res.json();
        accounts.value = accounts.value.map((a) =>
          a.id === updated.id ? updated : a
        );
      }
    } catch (error) {
      console.error("Error toggling account:", error);
    }
  };

  return (
    <div class="space-y-6">
      {/* Summary Card */}
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg text-slate-500">Total Balance</h2>
              <div
                class={`text-3xl font-bold ${
                  totalBalance() >= 0 ? "text-slate-800" : "text-red-600"
                }`}
              >
                {formatCurrency(totalBalance())}
              </div>
            </div>
            <button
              type="button"
              class="btn btn-primary"
              onClick={openAddModal}
            >
              + Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div class="card bg-white shadow-xl">
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th class="text-right">Balance</th>
                  <th class="text-right">Cleared</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.value.map((account) => (
                  <tr
                    key={account.id}
                    class={account.isClosed ? "opacity-50" : ""}
                  >
                    <td>
                      <div class="font-medium">{account.name}</div>
                      <div class="text-sm text-slate-500">
                        {account.institution}{" "}
                        {account.lastFour && `••${account.lastFour}`}
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-ghost">
                        {ACCOUNT_TYPES.find((t) =>
                          t.value === account.accountType
                        )?.label || account.accountType}
                      </span>
                    </td>
                    <td
                      class={`text-right font-semibold ${
                        (account.currentBalance ?? 0) >= 0 ? "" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(account.currentBalance ?? 0)}
                    </td>
                    <td class="text-right text-slate-500">
                      {formatCurrency(account.clearedBalance ?? 0)}
                    </td>
                    <td>
                      {account.isClosed
                        ? <span class="badge badge-error badge-sm">Closed</span>
                        : account.isOnBudget
                        ? (
                          <span class="badge badge-success badge-sm">
                            On Budget
                          </span>
                        )
                        : (
                          <span class="badge badge-warning badge-sm">
                            Tracking
                          </span>
                        )}
                    </td>
                    <td>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs"
                          onClick={() => openEditModal(account)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs"
                          onClick={() => toggleClosed(account)}
                        >
                          {account.isClosed ? "Reopen" : "Close"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">
              {editingAccount.value ? "Edit Account" : "Add Account"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">Account Name</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  value={formName.value}
                  onInput={(e) => formName.value = e.currentTarget.value}
                  required
                />
              </div>

              {!editingAccount.value && (
                <>
                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text">Account Type</span>
                    </label>
                    <select
                      class="select select-bordered"
                      value={formType.value}
                      onChange={(e) => formType.value = e.currentTarget.value}
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text">Starting Balance</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="input input-bordered"
                      value={formBalance.value}
                      onInput={(e) => formBalance.value = e.currentTarget.value}
                    />
                  </div>
                </>
              )}

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">Institution</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  placeholder="e.g., Chase Bank"
                  value={formInstitution.value}
                  onInput={(e) => formInstitution.value = e.currentTarget.value}
                />
              </div>

              {!editingAccount.value && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text">Last 4 Digits</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    class="input input-bordered"
                    placeholder="1234"
                    value={formLastFour.value}
                    onInput={(e) => formLastFour.value = e.currentTarget.value}
                  />
                </div>
              )}

              <div class="form-control mb-6">
                <label class="label cursor-pointer">
                  <span class="label-text">Include in Budget</span>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    checked={formOnBudget.value}
                    onChange={(e) =>
                      formOnBudget.value = e.currentTarget.checked}
                  />
                </label>
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

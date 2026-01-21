import { useSignal } from "@preact/signals";
import type { Account } from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

interface Props {
  initialAccounts: Account[];
  familyId?: string;
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

function AccountsManagerContent(
  { initialAccounts, familyId = "default" }: Props,
) {
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
      (sum, a) => sum + (a.balance ?? a.currentBalance ?? 0),
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
          toast.success("Account updated successfully!");
        } else {
          toast.error("Failed to update account");
        }
      } else {
        // Create new
        const res = await fetch(`${API_BASE}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyId, // Pass familyId here
            name: formName.value,
            accountType: formType.value,
            institution: formInstitution.value || null,
            lastFour: formLastFour.value || null,
            openingBalance: parseFloat(formBalance.value) || 0, // DTO expects OpeningBalance, check API mapping
            isOnBudget: formOnBudget.value,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          accounts.value = [...accounts.value, created];
          toast.success("Account created successfully!");
        } else {
          toast.error("Failed to create account");
        }
      }
      isModalOpen.value = false;
    } catch (error) {
      console.error("Error saving account:", error);
      toast.error("Failed to save account");
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
        toast.success(
          account.isClosed ? "Account reopened" : "Account closed",
        );
      } else {
        toast.error("Failed to update account status");
      }
    } catch (error) {
      console.error("Error toggling account:", error);
      toast.error("Failed to update account status");
    }
  };

  return (
    <div class="space-y-6">
      {/* Summary Card */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-4 md:p-6">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 class="text-sm md:text-lg text-[#888] font-mono">
                TOTAL BALANCE
              </h2>
              <div
                class={`text-2xl md:text-3xl font-bold font-mono ${
                  totalBalance() >= 0 ? "text-[#00ff88]" : "text-red-600"
                }`}
              >
                {formatCurrency(totalBalance())}
              </div>
            </div>
            <button
              type="button"
              class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
              onClick={openAddModal}
            >
              <span class="mr-2">+</span>Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                  <th class="text-[#888] font-mono text-xs">ACCOUNT</th>
                  <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                    TYPE
                  </th>
                  <th class="text-[#888] font-mono text-xs text-right">
                    BALANCE
                  </th>
                  <th class="text-[#888] font-mono text-xs text-right hidden md:table-cell">
                    CLEARED
                  </th>
                  <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                    STATUS
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accounts.value.map((account) => (
                  <tr
                    key={account.id}
                    class={`border-b border-[#333] hover:bg-[#1a1a1a] ${
                      account.isClosed ? "opacity-40" : ""
                    }`}
                  >
                    <td>
                      <div class="font-medium text-white">{account.name}</div>
                      <div class="text-xs text-[#888] font-mono">
                        {account.institution}{" "}
                        {account.lastFour && `••${account.lastFour}`}
                      </div>
                    </td>
                    <td class="hidden sm:table-cell">
                      <span class="badge bg-[#333] text-[#888] border-[#444] font-mono badge-xs">
                        {ACCOUNT_TYPES.find((t) =>
                          t.value === account.accountType
                        )?.label || account.accountType}
                      </span>
                    </td>
                    <td
                      class={`text-right font-semibold font-mono ${
                        (account.balance ?? account.currentBalance ?? 0) >= 0
                          ? "text-[#00ff88]"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(
                        account.balance ?? account.currentBalance ?? 0,
                      )}
                    </td>
                    <td class="text-right text-[#888] font-mono hidden md:table-cell">
                      {formatCurrency(account.clearedBalance ?? 0)}
                    </td>
                    <td class="hidden sm:table-cell">
                      {account.isClosed
                        ? (
                          <span class="badge badge-error border-red-500/50 font-mono badge-xs">
                            CLOSED
                          </span>
                        )
                        : account.isOnBudget
                        ? (
                          <span class="badge bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40 font-mono badge-xs">
                            ON BUDGET
                          </span>
                        )
                        : (
                          <span class="badge bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40 font-mono badge-xs">
                            TRACKING
                          </span>
                        )}
                    </td>
                    <td>
                      <div class="flex gap-1 flex-wrap justify-end">
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs min-h-[36px] border border-[#333] hover:border-[#00d9ff] text-[#888] hover:text-[#00d9ff] font-mono"
                          onClick={() => openEditModal(account)}
                          aria-label={`Edit ${account.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs min-h-[36px] border border-[#333] hover:border-white text-[#888] hover:text-white font-mono"
                          onClick={() => toggleClosed(account)}
                          aria-label={account.isClosed ? "Reopen" : "Close"}
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
          <div class="modal-box bg-[#1a1a1a] border border-[#333]">
            <h3 class="font-bold text-lg mb-4 text-[#00d9ff] font-mono">
              {editingAccount.value ? "EDIT ACCOUNT" : "ADD ACCOUNT"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    ACCOUNT NAME
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  value={formName.value}
                  onInput={(e) => formName.value = e.currentTarget.value}
                  required
                />
              </div>

              {!editingAccount.value && (
                <>
                  <div class="form-control mb-4">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-[#888]">
                        ACCOUNT TYPE
                      </span>
                    </label>
                    <select
                      class="select select-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
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
                      <span class="label-text font-mono text-xs text-[#888]">
                        STARTING BALANCE
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                      value={formBalance.value}
                      onInput={(e) => formBalance.value = e.currentTarget.value}
                    />
                  </div>
                </>
              )}

              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text font-mono text-xs text-[#888]">
                    INSTITUTION
                  </span>
                </label>
                <input
                  type="text"
                  class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                  placeholder="e.g., CHASE BANK"
                  value={formInstitution.value}
                  onInput={(e) => formInstitution.value = e.currentTarget.value}
                />
              </div>

              {!editingAccount.value && (
                <div class="form-control mb-4">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-[#888]">
                      LAST 4 DIGITS
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    class="input input-bordered !bg-[#0a0a0a] border-[#333] !text-white font-mono"
                    placeholder="1234"
                    value={formLastFour.value}
                    onInput={(e) => formLastFour.value = e.currentTarget.value}
                  />
                </div>
              )}

              <div class="form-control mb-6">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm"
                    checked={formOnBudget.value}
                    onChange={(e) =>
                      formOnBudget.value = e.currentTarget.checked}
                  />
                  <span class="label-text font-mono text-xs text-[#888]">
                    INCLUDE IN BUDGET
                  </span>
                </label>
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
          <div class="modal-backdrop" onClick={() => isModalOpen.value = false}>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsManager(props: Props) {
  return (
    <ErrorBoundary>
      <AccountsManagerContent {...props} />
    </ErrorBoundary>
  );
}

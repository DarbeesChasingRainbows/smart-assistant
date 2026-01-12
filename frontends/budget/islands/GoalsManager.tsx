import { useSignal } from "@preact/signals";
import type { Goal } from "../types/api.ts";

interface Props {
  initialGoals: Goal[];
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

const GOAL_TYPES = [
  { value: "savings", label: "Savings" },
  { value: "debt_payoff", label: "Debt Payoff" },
  { value: "emergency_fund", label: "Emergency Fund" },
];

export default function GoalsManager({ initialGoals }: Props) {
  const goals = useSignal<Goal[]>(initialGoals);
  const isModalOpen = useSignal(false);
  const editingGoal = useSignal<Goal | null>(null);
  const isSubmitting = useSignal(false);
  const contributionGoalId = useSignal<number | null>(null);
  const contributionAmount = useSignal("");

  const formName = useSignal("");
  const formTargetAmount = useSignal("");
  const formCurrentAmount = useSignal("0");
  const formTargetDate = useSignal("");
  const formGoalType = useSignal("savings");
  const formPriority = useSignal("1");
  const formNotes = useSignal("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const openAddModal = () => {
    editingGoal.value = null;
    formName.value = "";
    formTargetAmount.value = "";
    formCurrentAmount.value = "0";
    formTargetDate.value = "";
    formGoalType.value = "savings";
    formPriority.value = "1";
    formNotes.value = "";
    isModalOpen.value = true;
  };

  const openEditModal = (goal: Goal) => {
    editingGoal.value = goal;
    formName.value = goal.name;
    formTargetAmount.value = goal.targetAmount.toString();
    formCurrentAmount.value = goal.currentAmount.toString();
    formTargetDate.value = goal.targetDate || "";
    formGoalType.value = goal.goalType;
    formPriority.value = goal.priority.toString();
    formNotes.value = goal.notes || "";
    isModalOpen.value = true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isSubmitting.value = true;

    const payload = {
      name: formName.value,
      targetAmount: parseFloat(formTargetAmount.value) || 0,
      currentAmount: parseFloat(formCurrentAmount.value) || 0,
      targetDate: formTargetDate.value || null,
      goalType: formGoalType.value,
      priority: parseInt(formPriority.value) || 1,
      notes: formNotes.value || null,
    };

    try {
      if (editingGoal.value) {
        const res = await fetch(`${API_BASE}/goals/${editingGoal.value.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          goals.value = goals.value.map(g => g.id === updated.id ? updated : g);
        }
      } else {
        const res = await fetch(`${API_BASE}/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          goals.value = [...goals.value, created];
        }
      }
      isModalOpen.value = false;
    } catch (error) {
      console.error("Error saving goal:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const addContribution = async (goalId: number) => {
    const amount = parseFloat(contributionAmount.value) || 0;
    if (amount <= 0) return;

    const goal = goals.value.find(g => g.id === goalId);
    if (!goal) return;

    try {
      await fetch(`${API_BASE}/goals/${goalId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: goal.currentAmount + amount }),
      });
      goals.value = goals.value.map(g => 
        g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
      );
      contributionGoalId.value = null;
      contributionAmount.value = "";
    } catch (error) {
      console.error("Error adding contribution:", error);
    }
  };

  const markComplete = async (goal: Goal) => {
    try {
      await fetch(`${API_BASE}/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      goals.value = goals.value.map(g => 
        g.id === goal.id ? { ...g, isCompleted: true } : g
      );
    } catch (error) {
      console.error("Error completing goal:", error);
    }
  };

  const deleteGoal = async (goal: Goal) => {
    if (!confirm(`Delete "${goal.name}"?`)) return;
    try {
      await fetch(`${API_BASE}/goals/${goal.id}`, { method: "DELETE" });
      goals.value = goals.value.filter(g => g.id !== goal.id);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const activeGoals = goals.value.filter(g => !g.isCompleted);
  const completedGoals = goals.value.filter(g => g.isCompleted);

  return (
    <div class="space-y-6">
      <div class="flex justify-end">
        <button type="button" class="btn btn-primary" onClick={openAddModal}>+ Add Goal</button>
      </div>

      {/* Active Goals */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeGoals.map((goal) => {
          const percent = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
          const remaining = goal.targetAmount - goal.currentAmount;
          
          return (
            <div key={goal.id} class="card bg-white shadow-xl">
              <div class="card-body">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="card-title text-lg">{goal.name}</h3>
                    <span class="badge badge-ghost badge-sm">
                      {GOAL_TYPES.find(t => t.value === goal.goalType)?.label}
                    </span>
                  </div>
                  <div class="dropdown dropdown-end">
                    <label tabIndex={0} class="btn btn-ghost btn-xs">⋮</label>
                    <ul tabIndex={0} class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                      <li><a onClick={() => openEditModal(goal)}>Edit</a></li>
                      <li><a onClick={() => markComplete(goal)}>Complete</a></li>
                      <li><a class="text-error" onClick={() => deleteGoal(goal)}>Delete</a></li>
                    </ul>
                  </div>
                </div>

                <div class="mt-4">
                  <div class="flex justify-between text-sm mb-1">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span class="text-slate-500">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      class={`h-3 rounded-full transition-all ${percent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div class="flex justify-between text-sm mt-1">
                    <span class="text-slate-500">{percent.toFixed(0)}%</span>
                    <span class="text-slate-500">{formatCurrency(remaining)} to go</span>
                  </div>
                </div>

                {goal.targetDate && (
                  <div class="text-sm text-slate-500 mt-2">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </div>
                )}

                {/* Contribution Input */}
                {contributionGoalId.value === goal.id ? (
                  <div class="flex gap-2 mt-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      class="input input-bordered input-sm flex-1"
                      placeholder="Amount"
                      value={contributionAmount.value}
                      onInput={(e) => contributionAmount.value = e.currentTarget.value}
                    />
                    <button type="button" class="btn btn-success btn-sm" onClick={() => addContribution(goal.id)}>Add</button>
                    <button type="button" class="btn btn-ghost btn-sm" onClick={() => contributionGoalId.value = null}>×</button>
                  </div>
                ) : (
                  <button type="button" class="btn btn-outline btn-sm mt-4" onClick={() => contributionGoalId.value = goal.id}>
                    + Add Contribution
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeGoals.length === 0 && (
        <div class="card bg-white shadow-xl">
          <div class="card-body text-center py-12">
            <p class="text-slate-500">No active goals. Create one to start tracking!</p>
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div class="mt-8">
          <h2 class="text-xl font-semibold text-slate-600 mb-4">✓ Completed Goals</h2>
          <div class="space-y-2">
            {completedGoals.map((goal) => (
              <div key={goal.id} class="card bg-slate-50 shadow">
                <div class="card-body py-3 flex-row justify-between items-center">
                  <span class="font-medium text-slate-600">{goal.name}</span>
                  <span class="text-emerald-600">{formatCurrency(goal.targetAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">{editingGoal.value ? "Edit Goal" : "Add Goal"}</h3>
            <form onSubmit={handleSubmit}>
              <div class="form-control mb-4">
                <label class="label"><span class="label-text">Goal Name</span></label>
                <input type="text" class="input input-bordered" value={formName.value} onInput={(e) => formName.value = e.currentTarget.value} required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label"><span class="label-text">Target Amount</span></label>
                  <input type="number" step="0.01" class="input input-bordered" value={formTargetAmount.value} onInput={(e) => formTargetAmount.value = e.currentTarget.value} required />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Current Amount</span></label>
                  <input type="number" step="0.01" class="input input-bordered" value={formCurrentAmount.value} onInput={(e) => formCurrentAmount.value = e.currentTarget.value} />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Target Date</span></label>
                  <input type="date" class="input input-bordered" value={formTargetDate.value} onInput={(e) => formTargetDate.value = e.currentTarget.value} />
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Goal Type</span></label>
                  <select class="select select-bordered" value={formGoalType.value} onChange={(e) => formGoalType.value = e.currentTarget.value}>
                    {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label"><span class="label-text">Priority</span></label>
                  <input type="number" min="1" max="10" class="input input-bordered" value={formPriority.value} onInput={(e) => formPriority.value = e.currentTarget.value} />
                </div>
              </div>
              <div class="form-control mt-4">
                <label class="label"><span class="label-text">Notes</span></label>
                <textarea class="textarea textarea-bordered" value={formNotes.value} onInput={(e) => formNotes.value = e.currentTarget.value}></textarea>
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

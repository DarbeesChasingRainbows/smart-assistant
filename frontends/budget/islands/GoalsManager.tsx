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
  const isContributionModalOpen = useSignal(false);
  const contributionModalGoal = useSignal<Goal | null>(null);
  const celebratingGoalId = useSignal<number | null>(null);

  const formName = useSignal("");
  const formTargetAmount = useSignal("");
  const formCurrentAmount = useSignal("0");
  const formTargetDate = useSignal("");
  const formGoalType = useSignal("savings");
  const formPriority = useSignal("1");
  const formNotes = useSignal("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

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
          goals.value = goals.value.map((g) =>
            g.id === updated.id ? updated : g
          );
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

  const openContributionModal = (goal: Goal) => {
    contributionModalGoal.value = goal;
    contributionAmount.value = "";
    isContributionModalOpen.value = true;
  };

  const closeContributionModal = () => {
    isContributionModalOpen.value = false;
    contributionModalGoal.value = null;
    contributionAmount.value = "";
  };

  const calculateFundingSchedule = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return null;

    if (!goal.targetDate) {
      return {
        periodsNeeded: null,
        perPeriodAmount: null,
        suggestion: "Set a target date to see funding schedule",
      };
    }

    const now = new Date();
    const target = new Date(goal.targetDate);
    const weeksRemaining = Math.max(
      1,
      Math.ceil((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    );
    const monthsRemaining = Math.max(1, Math.ceil(weeksRemaining / 4.33));

    const perWeek = remaining / weeksRemaining;
    const perMonth = remaining / monthsRemaining;

    return {
      periodsNeeded: weeksRemaining,
      perWeekAmount: perWeek,
      perMonthAmount: perMonth,
      suggestion: `Save ${formatCurrency(perWeek)}/week or ${
        formatCurrency(perMonth)
      }/month to reach goal`,
    };
  };

  const addContribution = async (goalId: number) => {
    const amount = parseFloat(contributionAmount.value) || 0;
    if (amount <= 0) return;

    const goal = goals.value.find((g) => g.id === goalId);
    if (!goal) return;

    isSubmitting.value = true;

    try {
      const newAmount = goal.currentAmount + amount;
      const isNowComplete = newAmount >= goal.targetAmount;

      await fetch(`${API_BASE}/goals/${goalId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: newAmount }),
      });

      goals.value = goals.value.map((g) =>
        g.id === goalId
          ? { ...g, currentAmount: newAmount, isCompleted: isNowComplete }
          : g
      );

      // Show celebration if goal completed
      if (isNowComplete && !goal.isCompleted) {
        celebratingGoalId.value = goalId;
        setTimeout(() => {
          celebratingGoalId.value = null;
        }, 5000);
      }

      closeContributionModal();
    } catch (error) {
      console.error("Error adding contribution:", error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const markComplete = async (goal: Goal) => {
    try {
      await fetch(`${API_BASE}/goals/${goal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      goals.value = goals.value.map((g) =>
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
      goals.value = goals.value.filter((g) => g.id !== goal.id);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const activeGoals = goals.value.filter((g) => !g.isCompleted);
  const completedGoals = goals.value.filter((g) => g.isCompleted);

  return (
    <div class="space-y-6">
      <div class="flex justify-end">
        <button type="button" class="btn btn-primary" onClick={openAddModal}>
          + Add Goal
        </button>
      </div>

      {/* Active Goals */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeGoals.map((goal) => {
          const percent = goal.targetAmount > 0
            ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
            : 0;
          const remaining = goal.targetAmount - goal.currentAmount;

          return (
            <div key={goal.id} class="card bg-white shadow-xl">
              <div class="card-body">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="card-title text-lg">{goal.name}</h3>
                    <span class="badge badge-ghost badge-sm">
                      {GOAL_TYPES.find((t) => t.value === goal.goalType)?.label}
                    </span>
                  </div>
                  <div class="dropdown dropdown-end">
                    <label tabIndex={0} class="btn btn-ghost btn-xs">⋮</label>
                    <ul
                      tabIndex={0}
                      class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32"
                    >
                      <li>
                        <a onClick={() => openEditModal(goal)}>Edit</a>
                      </li>
                      <li>
                        <a onClick={() => markComplete(goal)}>Complete</a>
                      </li>
                      <li>
                        <a class="text-error" onClick={() => deleteGoal(goal)}>
                          Delete
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="mt-4">
                  {/* Radial Progress for Visual Impact */}
                  <div class="flex items-center gap-6 mb-4">
                    <div
                      class={`radial-progress ${
                        percent >= 100
                          ? "text-success"
                          : percent >= 75
                          ? "text-info"
                          : "text-primary"
                      }`}
                      style={{
                        "--value": Math.min(100, percent),
                        "--size": "5rem",
                        "--thickness": "4px",
                      }}
                      role="progressbar"
                      aria-valuenow={Math.min(100, percent)}
                    >
                      {percent.toFixed(0)}%
                    </div>
                    <div class="flex-1">
                      <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span class="text-slate-500">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <progress
                        class={`progress w-full ${
                          percent >= 100
                            ? "progress-success"
                            : percent >= 75
                            ? "progress-info"
                            : "progress-primary"
                        }`}
                        value={Math.min(100, percent)}
                        max="100"
                      >
                      </progress>
                      <div class="flex justify-between text-xs mt-1 text-slate-500">
                        <span>{formatCurrency(remaining)} remaining</span>
                        {goal.targetDate && (
                          <span>
                            Due {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Funding Schedule Display */}
                  {(() => {
                    const schedule = calculateFundingSchedule(goal);
                    if (schedule && schedule.perWeekAmount) {
                      return (
                        <div class="alert alert-info py-2 text-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            class="stroke-current shrink-0 w-4 h-4"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{schedule.suggestion}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Celebration Banner */}
                {celebratingGoalId.value === goal.id && (
                  <div class="alert alert-success mt-4 animate-pulse">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="stroke-current shrink-0 h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span class="font-bold">
                      🎉 Congratulations! Goal completed!
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  class="btn btn-primary btn-sm mt-4 w-full"
                  onClick={() => openContributionModal(goal)}
                  disabled={percent >= 100}
                >
                  {percent >= 100 ? "✓ Goal Reached!" : "💰 Contribute to Goal"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeGoals.length === 0 && (
        <div class="card bg-white shadow-xl">
          <div class="card-body text-center py-12">
            <p class="text-slate-500">
              No active goals. Create one to start tracking!
            </p>
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div class="mt-8">
          <h2 class="text-xl font-semibold text-slate-600 mb-4">
            ✓ Completed Goals
          </h2>
          <div class="space-y-2">
            {completedGoals.map((goal) => (
              <div key={goal.id} class="card bg-slate-50 shadow">
                <div class="card-body py-3 flex-row justify-between items-center">
                  <span class="font-medium text-slate-600">{goal.name}</span>
                  <span class="text-emerald-600">
                    {formatCurrency(goal.targetAmount)}
                  </span>
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
            <h3 class="font-bold text-lg mb-4">
              {editingGoal.value ? "Edit Goal" : "Add Goal"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div class="form-control mb-4">
                <label class="label">
                  <span class="label-text">Goal Name</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  value={formName.value}
                  onInput={(e) => formName.value = e.currentTarget.value}
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Target Amount</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered"
                    value={formTargetAmount.value}
                    onInput={(e) =>
                      formTargetAmount.value = e.currentTarget.value}
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Current Amount</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    class="input input-bordered"
                    value={formCurrentAmount.value}
                    onInput={(e) =>
                      formCurrentAmount.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Target Date</span>
                  </label>
                  <input
                    type="date"
                    class="input input-bordered"
                    value={formTargetDate.value}
                    onInput={(e) =>
                      formTargetDate.value = e.currentTarget.value}
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Goal Type</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={formGoalType.value}
                    onChange={(e) => formGoalType.value = e.currentTarget.value}
                  >
                    {GOAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Priority</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    class="input input-bordered"
                    value={formPriority.value}
                    onInput={(e) => formPriority.value = e.currentTarget.value}
                  />
                </div>
              </div>
              <div class="form-control mt-4">
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

      {/* Contribution Modal */}
      {isContributionModalOpen.value && contributionModalGoal.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg mb-4">
              💰 Contribute to {contributionModalGoal.value.name}
            </h3>

            {/* Goal Progress Summary */}
            <div class="bg-slate-50 p-4 rounded-lg mb-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-slate-600">Current Progress</span>
                <span class="font-bold text-lg">
                  {(
                    (contributionModalGoal.value.currentAmount /
                      contributionModalGoal.value.targetAmount) * 100
                  ).toFixed(0)}%
                </span>
              </div>
              <progress
                class="progress progress-primary w-full mb-2"
                value={Math.min(
                  100,
                  (contributionModalGoal.value.currentAmount /
                    contributionModalGoal.value.targetAmount) * 100,
                )}
                max="100"
              >
              </progress>
              <div class="flex justify-between text-xs text-slate-500">
                <span>
                  {formatCurrency(contributionModalGoal.value.currentAmount)}
                </span>
                <span>
                  {formatCurrency(contributionModalGoal.value.targetAmount)}
                </span>
              </div>
            </div>

            {/* Funding Schedule Info */}
            {(() => {
              const schedule = calculateFundingSchedule(
                contributionModalGoal.value,
              );
              if (schedule && schedule.perWeekAmount) {
                return (
                  <div class="alert alert-info mb-4 py-2 text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      class="stroke-current shrink-0 w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <div class="font-medium">Suggested Schedule:</div>
                      <div>{schedule.suggestion}</div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Contribution Input */}
            <div class="form-control">
              <label class="label">
                <span class="label-text">Contribution Amount</span>
              </label>
              <div class="join w-full">
                <span class="join-item bg-slate-100 flex items-center px-4">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  class="input input-bordered join-item flex-1"
                  placeholder="0.00"
                  value={contributionAmount.value}
                  onInput={(e) =>
                    contributionAmount.value = e.currentTarget.value}
                  autofocus
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div class="flex gap-2 mt-3">
              {(() => {
                const schedule = calculateFundingSchedule(
                  contributionModalGoal.value,
                );
                const remaining = contributionModalGoal.value.targetAmount -
                  contributionModalGoal.value.currentAmount;
                const buttons = [];

                if (schedule?.perWeekAmount) {
                  buttons.push(
                    <button
                      key="week"
                      type="button"
                      class="btn btn-sm btn-outline flex-1"
                      onClick={() =>
                        contributionAmount.value = schedule.perWeekAmount!
                          .toFixed(2)}
                    >
                      Weekly ({formatCurrency(schedule.perWeekAmount)})
                    </button>,
                  );
                }
                if (schedule?.perMonthAmount) {
                  buttons.push(
                    <button
                      key="month"
                      type="button"
                      class="btn btn-sm btn-outline flex-1"
                      onClick={() =>
                        contributionAmount.value = schedule.perMonthAmount!
                          .toFixed(2)}
                    >
                      Monthly ({formatCurrency(schedule.perMonthAmount)})
                    </button>,
                  );
                }
                buttons.push(
                  <button
                    key="full"
                    type="button"
                    class="btn btn-sm btn-outline flex-1"
                    onClick={() =>
                      contributionAmount.value = remaining.toFixed(2)}
                  >
                    Full ({formatCurrency(remaining)})
                  </button>,
                );

                return buttons;
              })()}
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn"
                onClick={closeContributionModal}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => addContribution(contributionModalGoal.value!.id)}
                disabled={isSubmitting.value ||
                  !contributionAmount.value ||
                  parseFloat(contributionAmount.value) <= 0}
              >
                {isSubmitting.value
                  ? <span class="loading loading-spinner loading-sm"></span>
                  : "Add Contribution"}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={closeContributionModal}>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type {
  CategoryBalance,
  CategoryGroup,
  Goal,
  Transaction,
} from "../types/api.ts";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";

interface PayPeriodDto {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalIncome: number;
}

interface Props {
  currentPeriod: PayPeriodDto | null;
  recentPeriods: PayPeriodDto[];
  categoryBalances: CategoryBalance[];
  categoryGroups: CategoryGroup[];
  transactions: Transaction[];
  goals: Goal[];
}

// Chart.js is loaded via CDN in the route
// deno-lint-ignore no-explicit-any
declare const Chart: any;

const CHART_COLORS = {
  cyan: "rgba(0, 217, 255, 0.8)",
  cyanLight: "rgba(0, 217, 255, 0.2)",
  green: "rgba(0, 255, 136, 0.8)",
  greenLight: "rgba(0, 255, 136, 0.2)",
  orange: "rgba(255, 176, 0, 0.8)",
  orangeLight: "rgba(255, 176, 0, 0.2)",
  red: "rgba(239, 68, 68, 0.8)",
  redLight: "rgba(239, 68, 68, 0.2)",
  purple: "rgba(168, 85, 247, 0.8)",
  purpleLight: "rgba(168, 85, 247, 0.2)",
  pink: "rgba(236, 72, 153, 0.8)",
  pinkLight: "rgba(236, 72, 153, 0.2)",
  gray: "rgba(156, 163, 175, 0.8)",
  grayLight: "rgba(156, 163, 175, 0.2)",
};

const CATEGORY_COLORS = [
  CHART_COLORS.cyan,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
  CHART_COLORS.red,
  CHART_COLORS.gray,
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function ReportsManagerContent({
  currentPeriod,
  recentPeriods: _recentPeriods,
  categoryBalances,
  categoryGroups,
  transactions,
  goals,
}: Props) {
  const activeTab = useSignal<"spending" | "trends" | "goals">("spending");
  
  // Chart refs
  const spendingChartRef = useRef<HTMLCanvasElement>(null);
  // deno-lint-ignore no-explicit-any
  const spendingChartInstance = useRef<any>(null);
  const trendsChartRef = useRef<HTMLCanvasElement>(null);
  // deno-lint-ignore no-explicit-any
  const trendsChartInstance = useRef<any>(null);
  const goalsChartRef = useRef<HTMLCanvasElement>(null);
  // deno-lint-ignore no-explicit-any
  const goalsChartInstance = useRef<any>(null);

  // Calculate spending by category group (expense groups only)
  const spendingByGroup = categoryGroups
    .filter((g) => g.type !== "Income")
    .map((group) => {
      const groupBalances = categoryBalances.filter(
        (b) => b.groupName === group.name
      );
      const totalSpent = groupBalances.reduce((sum, b) => sum + b.spent, 0);
      const totalBudgeted = groupBalances.reduce((sum, b) => sum + b.assigned, 0);
      return {
        name: group.name,
        spent: totalSpent,
        budgeted: totalBudgeted,
        categories: groupBalances,
      };
    })
    .filter((g) => g.spent > 0 || g.budgeted > 0);

  // Calculate monthly spending trends from transactions
  const spendingTrends = (() => {
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    transactions.forEach((tx) => {
      const date = new Date(tx.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (tx.amount > 0) {
        monthlyData[monthKey].income += tx.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(tx.amount);
      }
    });

    // Sort by month and take last 6 months
    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
    return sortedMonths.map((month) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      ...monthlyData[month],
    }));
  })();

  // Spending by Category Pie Chart
  useEffect(() => {
    if (activeTab.value !== "spending" || !spendingChartRef.current) return;
    if (typeof Chart === "undefined") return;

    // Destroy existing chart
    if (spendingChartInstance.current) {
      spendingChartInstance.current.destroy();
    }

    const ctx = spendingChartRef.current.getContext("2d");
    if (!ctx) return;

    const data = {
      labels: spendingByGroup.map((g) => g.name.toUpperCase()),
      datasets: [
        {
          data: spendingByGroup.map((g) => g.spent),
          backgroundColor: CATEGORY_COLORS.slice(0, spendingByGroup.length),
          borderColor: "#1a1a1a",
          borderWidth: 2,
        },
      ],
    };

    spendingChartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#a0a0a0",
              font: { family: "monospace", size: 11 },
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              // deno-lint-ignore no-explicit-any
              label: (context: any) => {
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
        cutout: "60%",
      },
    });

    return () => {
      if (spendingChartInstance.current) {
        spendingChartInstance.current.destroy();
      }
    };
  }, [activeTab.value, spendingByGroup]);

  // Spending Trends Line Chart
  useEffect(() => {
    if (activeTab.value !== "trends" || !trendsChartRef.current) return;
    if (typeof Chart === "undefined") return;

    if (trendsChartInstance.current) {
      trendsChartInstance.current.destroy();
    }

    const ctx = trendsChartRef.current.getContext("2d");
    if (!ctx) return;

    const data = {
      labels: spendingTrends.map((t) => t.label),
      datasets: [
        {
          label: "INCOME",
          data: spendingTrends.map((t) => t.income),
          borderColor: CHART_COLORS.green,
          backgroundColor: CHART_COLORS.greenLight,
          fill: true,
          tension: 0.3,
        },
        {
          label: "EXPENSES",
          data: spendingTrends.map((t) => t.expenses),
          borderColor: CHART_COLORS.red,
          backgroundColor: CHART_COLORS.redLight,
          fill: true,
          tension: 0.3,
        },
      ],
    };

    trendsChartInstance.current = new Chart(ctx, {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#a0a0a0",
              font: { family: "monospace", size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              // deno-lint-ignore no-explicit-any
              label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: "#333" },
            ticks: { color: "#888", font: { family: "monospace" } },
          },
          y: {
            grid: { color: "#333" },
            ticks: {
              color: "#888",
              font: { family: "monospace" },
              // deno-lint-ignore no-explicit-any
              callback: (value: any) => formatCurrency(value as number),
            },
          },
        },
      },
    });

    return () => {
      if (trendsChartInstance.current) {
        trendsChartInstance.current.destroy();
      }
    };
  }, [activeTab.value, spendingTrends]);

  // Goals Progress Bar Chart
  useEffect(() => {
    if (activeTab.value !== "goals" || !goalsChartRef.current) return;
    if (typeof Chart === "undefined") return;

    if (goalsChartInstance.current) {
      goalsChartInstance.current.destroy();
    }

    const ctx = goalsChartRef.current.getContext("2d");
    if (!ctx) return;

    const activeGoals = goals.filter((g) => !g.isCompleted).slice(0, 8);

    const data = {
      labels: activeGoals.map((g) => g.name.toUpperCase()),
      datasets: [
        {
          label: "CURRENT",
          data: activeGoals.map((g) => g.currentAmount),
          backgroundColor: CHART_COLORS.cyan,
          borderColor: CHART_COLORS.cyan,
          borderWidth: 1,
        },
        {
          label: "REMAINING",
          data: activeGoals.map((g) => Math.max(0, g.targetAmount - g.currentAmount)),
          backgroundColor: CHART_COLORS.grayLight,
          borderColor: CHART_COLORS.gray,
          borderWidth: 1,
        },
      ],
    };

    goalsChartInstance.current = new Chart(ctx, {
      type: "bar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#a0a0a0",
              font: { family: "monospace", size: 11 },
            },
          },
          tooltip: {
            callbacks: {
              // deno-lint-ignore no-explicit-any
              label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: "#333" },
            ticks: {
              color: "#888",
              font: { family: "monospace" },
              callback: (value: number) => formatCurrency(value),
            },
          },
          y: {
            stacked: true,
            grid: { color: "#333" },
            ticks: { color: "#888", font: { family: "monospace", size: 10 } },
          },
        },
      },
    });

    return () => {
      if (goalsChartInstance.current) {
        goalsChartInstance.current.destroy();
      }
    };
  }, [activeTab.value, goals]);

  // Calculate totals
  const totalSpent = spendingByGroup.reduce((sum, g) => sum + g.spent, 0);
  const totalBudgeted = spendingByGroup.reduce((sum, g) => sum + g.budgeted, 0);
  const totalIncome = currentPeriod?.totalIncome || 0;

  return (
    <div class="space-y-6">
      {/* Summary Cards */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card bg-theme-secondary border border-theme p-4">
          <div class="text-xs text-theme-secondary font-mono">TOTAL INCOME</div>
          <div class="text-xl font-bold text-accent-green font-mono">
            {formatCurrency(totalIncome)}
          </div>
        </div>
        <div class="card bg-theme-secondary border border-theme p-4">
          <div class="text-xs text-theme-secondary font-mono">TOTAL BUDGETED</div>
          <div class="text-xl font-bold text-accent-cyan font-mono">
            {formatCurrency(totalBudgeted)}
          </div>
        </div>
        <div class="card bg-theme-secondary border border-theme p-4">
          <div class="text-xs text-theme-secondary font-mono">TOTAL SPENT</div>
          <div class="text-xl font-bold text-accent-orange font-mono">
            {formatCurrency(totalSpent)}
          </div>
        </div>
        <div class="card bg-theme-secondary border border-theme p-4">
          <div class="text-xs text-theme-secondary font-mono">REMAINING</div>
          <div class={`text-xl font-bold font-mono ${totalBudgeted - totalSpent >= 0 ? "text-accent-green" : "text-red-500"}`}>
            {formatCurrency(totalBudgeted - totalSpent)}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div class="tabs tabs-boxed bg-theme-secondary border border-theme p-1">
        <button
          type="button"
          class={`tab font-mono ${activeTab.value === "spending" ? "tab-active bg-accent-cyan/20 text-accent-cyan" : "text-theme-secondary"}`}
          onClick={() => activeTab.value = "spending"}
        >
          📊 SPENDING
        </button>
        <button
          type="button"
          class={`tab font-mono ${activeTab.value === "trends" ? "tab-active bg-accent-cyan/20 text-accent-cyan" : "text-theme-secondary"}`}
          onClick={() => activeTab.value = "trends"}
        >
          📈 TRENDS
        </button>
        <button
          type="button"
          class={`tab font-mono ${activeTab.value === "goals" ? "tab-active bg-accent-cyan/20 text-accent-cyan" : "text-theme-secondary"}`}
          onClick={() => activeTab.value = "goals"}
        >
          🎯 GOALS
        </button>
      </div>

      {/* Spending by Category Tab */}
      {activeTab.value === "spending" && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div class="card bg-theme-secondary border border-theme p-4">
            <h3 class="text-sm font-bold font-mono text-theme-primary mb-4 flex items-center gap-2">
              <span class="text-accent-cyan">[</span>
              <span>SPENDING BY CATEGORY</span>
              <span class="text-accent-cyan">]</span>
            </h3>
            <div class="h-64 md:h-80">
              {spendingByGroup.length > 0 ? (
                <canvas ref={spendingChartRef}></canvas>
              ) : (
                <div class="flex items-center justify-center h-full text-theme-secondary font-mono text-sm">
                  No spending data available
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div class="card bg-theme-secondary border border-theme p-4">
            <h3 class="text-sm font-bold font-mono text-theme-primary mb-4 flex items-center gap-2">
              <span class="text-accent-cyan">[</span>
              <span>CATEGORY BREAKDOWN</span>
              <span class="text-accent-cyan">]</span>
            </h3>
            <div class="overflow-x-auto max-h-80">
              <table class="table table-xs">
                <thead>
                  <tr class="border-b border-theme">
                    <th class="text-theme-secondary font-mono">CATEGORY</th>
                    <th class="text-theme-secondary font-mono text-right">BUDGETED</th>
                    <th class="text-theme-secondary font-mono text-right">SPENT</th>
                    <th class="text-theme-secondary font-mono text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {spendingByGroup.map((group, idx) => (
                    <tr key={group.name} class="border-b border-theme/50 hover:bg-theme-tertiary">
                      <td class="font-mono text-theme-primary flex items-center gap-2">
                        <span
                          class="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        {group.name.toUpperCase()}
                      </td>
                      <td class="font-mono text-right text-theme-secondary">
                        {formatCurrency(group.budgeted)}
                      </td>
                      <td class="font-mono text-right text-accent-orange">
                        {formatCurrency(group.spent)}
                      </td>
                      <td class={`font-mono text-right ${group.budgeted > 0 && group.spent > group.budgeted ? "text-red-500" : "text-accent-green"}`}>
                        {group.budgeted > 0 ? Math.round((group.spent / group.budgeted) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Spending Trends Tab */}
      {activeTab.value === "trends" && (
        <div class="card bg-theme-secondary border border-theme p-4">
          <h3 class="text-sm font-bold font-mono text-theme-primary mb-4 flex items-center gap-2">
            <span class="text-accent-cyan">[</span>
            <span>INCOME VS EXPENSES (LAST 6 MONTHS)</span>
            <span class="text-accent-cyan">]</span>
          </h3>
          <div class="h-64 md:h-96">
            {spendingTrends.length > 0 ? (
              <canvas ref={trendsChartRef}></canvas>
            ) : (
              <div class="flex items-center justify-center h-full text-theme-secondary font-mono text-sm">
                No transaction data available for trends
              </div>
            )}
          </div>

          {/* Monthly Summary Table */}
          {spendingTrends.length > 0 && (
            <div class="mt-6 overflow-x-auto">
              <table class="table table-xs">
                <thead>
                  <tr class="border-b border-theme">
                    <th class="text-theme-secondary font-mono">MONTH</th>
                    <th class="text-theme-secondary font-mono text-right">INCOME</th>
                    <th class="text-theme-secondary font-mono text-right">EXPENSES</th>
                    <th class="text-theme-secondary font-mono text-right">NET</th>
                  </tr>
                </thead>
                <tbody>
                  {spendingTrends.map((trend) => {
                    const net = trend.income - trend.expenses;
                    return (
                      <tr key={trend.month} class="border-b border-theme/50 hover:bg-theme-tertiary">
                        <td class="font-mono text-theme-primary">{trend.label}</td>
                        <td class="font-mono text-right text-accent-green">
                          {formatCurrency(trend.income)}
                        </td>
                        <td class="font-mono text-right text-red-400">
                          {formatCurrency(trend.expenses)}
                        </td>
                        <td class={`font-mono text-right ${net >= 0 ? "text-accent-green" : "text-red-500"}`}>
                          {formatCurrency(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Goals Progress Tab */}
      {activeTab.value === "goals" && (
        <div class="space-y-6">
          {/* Goals Chart */}
          <div class="card bg-theme-secondary border border-theme p-4">
            <h3 class="text-sm font-bold font-mono text-theme-primary mb-4 flex items-center gap-2">
              <span class="text-accent-cyan">[</span>
              <span>GOAL PROGRESS</span>
              <span class="text-accent-cyan">]</span>
            </h3>
            <div class="h-64 md:h-80">
              {goals.filter((g) => !g.isCompleted).length > 0 ? (
                <canvas ref={goalsChartRef}></canvas>
              ) : (
                <div class="flex items-center justify-center h-full text-theme-secondary font-mono text-sm">
                  No active goals
                </div>
              )}
            </div>
          </div>

          {/* Goals Detail Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const percent = goal.targetAmount > 0
                ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  class={`card bg-theme-secondary border p-4 ${goal.isCompleted ? "border-accent-green/50" : "border-theme"}`}
                >
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="font-mono font-bold text-theme-primary text-sm">
                      {goal.name.toUpperCase()}
                    </h4>
                    {goal.isCompleted && (
                      <span class="badge badge-xs bg-accent-green/20 text-accent-green border-accent-green/40 font-mono">
                        ✓ DONE
                      </span>
                    )}
                  </div>

                  <div class="flex justify-between text-xs font-mono mb-2">
                    <span class="text-theme-secondary">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                    <span class={goal.isCompleted ? "text-accent-green" : "text-accent-cyan"}>
                      {percent.toFixed(0)}%
                    </span>
                  </div>

                  <div class="w-full bg-theme-tertiary h-2 rounded-full overflow-hidden">
                    <div
                      class={`h-full transition-all ${goal.isCompleted ? "bg-accent-green" : "bg-accent-cyan"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {!goal.isCompleted && remaining > 0 && (
                    <div class="text-[10px] text-theme-secondary font-mono mt-2">
                      {formatCurrency(remaining)} remaining
                      {goal.targetDate && (
                        <span class="ml-2">
                          • Due: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsManager(props: Props) {
  return (
    <ErrorBoundary>
      <ReportsManagerContent {...props} />
    </ErrorBoundary>
  );
}

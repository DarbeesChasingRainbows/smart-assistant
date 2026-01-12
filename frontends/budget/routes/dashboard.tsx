import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";
import type { CategoryBalance } from "../types/api.ts";

interface AccountSummaryDto {
  accountKey: string;
  accountName: string;
  accountType: string;
  balance: number;
  clearedBalance: number;
  unclearedCount: number;
}

interface UpcomingBillDto {
  billKey: string;
  billName: string;
  amount: number;
  dueDate: string;
  categoryName: string;
  accountName: string;
  isAutoPay: boolean;
}

interface BudgetGoalDto {
  goalKey: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
}

interface PayPeriodBudgetSummaryDto {
  payPeriodKey: string;
  payPeriodName: string;
  totalIncome: number;
  totalAssigned: number;
  unassigned: number;
  isFullyAllocated: boolean;
}

interface BudgetPayPeriodDto {
  key: string;
  familyId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalIncome: number;
  createdAt: string;
  updatedAt: string;
}

interface BudgetDashboardDto {
  currentPayPeriod: BudgetPayPeriodDto | null;
  budgetSummary: PayPeriodBudgetSummaryDto | null;
  accounts: AccountSummaryDto[];
  upcomingBills: UpcomingBillDto[];
  goals: BudgetGoalDto[];
  categoryBalances: CategoryBalance[];
}

interface DashboardData {
  dashboard: BudgetDashboardDto | null;
  error?: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const requestUrl = new URL(ctx.req.url);
    const familyId = requestUrl.searchParams.get("familyId") ?? "default";

    const rawApiUrl = Deno.env.get("VITE_API_URL");
    const apiUrl = rawApiUrl || "http://localhost:5120/api";
    const normalizedBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

    try {
      const dashboardRes = await fetch(`${normalizedBase}/v1/budget/dashboard?familyId=${encodeURIComponent(familyId)}`, {
        headers: { Accept: "application/json" },
      });

      if (!dashboardRes.ok) {
        return {
          data: {
            dashboard: null,
            error: `Backend error (${dashboardRes.status}) loading budget dashboard`,
          },
        };
      }

      const dashboard: BudgetDashboardDto = await dashboardRes.json();
      return { data: { dashboard } };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return { data: { dashboard: null, error: "Could not connect to backend" } };
    }
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default define.page<typeof handler>(function Dashboard(props) {
  const { dashboard, error } = props.data as DashboardData;

  const period = dashboard?.currentPayPeriod ?? null;
  const summary = dashboard?.budgetSummary ?? null;
  const accounts = dashboard?.accounts ?? [];
  const upcomingBills = dashboard?.upcomingBills ?? [];
  const goals = dashboard?.goals ?? [];
  const totalAccountBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Dashboard</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css" rel="stylesheet" type="text/css" />
      </Head>

      {/* Header */}
      <header class="bg-slate-800 text-white p-4 shadow-lg">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a href={url("/")} class="text-2xl font-bold hover:text-slate-300">
              💰 Budget
            </a>
            {period && (
              <span class="badge badge-primary badge-lg">
                {period.name}
              </span>
            )}
          </div>
          <nav class="flex items-center gap-2">
            <a href={url("/accounts")} class="btn btn-ghost btn-sm">Accounts</a>
            <a href={url("/transactions")} class="btn btn-ghost btn-sm">Transactions</a>
            <a href={url("/bills")} class="btn btn-ghost btn-sm">Bills</a>
            <a href={url("/goals")} class="btn btn-ghost btn-sm">Goals</a>
            <a href={url("/settings")} class="btn btn-ghost btn-sm">Settings</a>
          </nav>
          <div class="flex items-center gap-4">
            <a href={url("/")} class="btn btn-ghost btn-sm">
              Switch
            </a>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto p-6">
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Accounts & Bills */}
          <div class="space-y-6">
            {/* Account Balances */}
            <div class="card bg-white shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-lg">
                  💳 Accounts
                  <span class="ml-auto text-xl font-bold text-slate-700">
                    {formatCurrency(totalAccountBalance)}
                  </span>
                </h2>
                <div class="divide-y">
                  {accounts.map((account) => (
                    <div key={account.accountKey} class="py-3 flex justify-between items-center">
                      <div>
                        <div class="font-medium">{account.accountName}</div>
                        <div class="text-xs text-slate-500">{account.accountType}</div>
                      </div>
                      <div class={`font-semibold ${account.balance >= 0 ? "text-slate-700" : "text-red-600"}`}>
                        {formatCurrency(account.balance)}
                      </div>
                    </div>
                  ))}
                </div>
                <a href={url("/accounts")} class="btn btn-ghost btn-sm mt-2">Manage Accounts →</a>
              </div>
            </div>

            {/* Upcoming Bills */}
            <div class="card bg-white shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-lg">📅 Upcoming Bills</h2>
                {upcomingBills.length === 0 ? (
                  <p class="text-slate-500 text-sm">No bills due in the next 14 days</p>
                ) : (
                  <div class="divide-y">
                    {upcomingBills.slice(0, 5).map((bill) => {
                      const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
                      const isOverdue = dueDate && dueDate < new Date();
                      const isDueSoon = dueDate && !isOverdue && dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <div key={bill.billKey} class="py-3 flex justify-between items-center">
                          <div>
                            <div class="font-medium flex items-center gap-2">
                              {bill.billName}
                              {bill.isAutoPay && <span class="badge badge-xs badge-success">Auto</span>}
                            </div>
                            <div class={`text-xs ${isOverdue ? "text-red-600 font-semibold" : isDueSoon ? "text-yellow-600" : "text-slate-500"}`}>
                              {isOverdue ? "OVERDUE" : dueDate?.toLocaleDateString()}
                            </div>
                          </div>
                          <div class="font-semibold text-slate-700">
                            {formatCurrency(bill.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <a href={url("/bills")} class="btn btn-ghost btn-sm mt-2">Manage Bills →</a>
              </div>
            </div>

            {/* Goals Progress */}
            <div class="card bg-white shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-lg">🎯 Goals</h2>
                {goals.length === 0 ? (
                  <p class="text-slate-500 text-sm">No active goals</p>
                ) : (
                  <div class="space-y-4">
                    {goals.slice(0, 3).map((goal) => {
                      const percent = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
                      return (
                        <div key={goal.goalKey}>
                          <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium">{goal.goalName}</span>
                            <span class="text-slate-500">
                              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                            </span>
                          </div>
                          <div class="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              class="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <a href={url("/goals")} class="btn btn-ghost btn-sm mt-2">Manage Goals →</a>
              </div>
            </div>
          </div>

          {/* Right Column - Budget Assignment (2 cols wide) */}
          <div class="lg:col-span-2">
            {summary && period ? (
              <div class="card bg-white shadow-xl">
                <div class="card-body">
                  <h2 class="card-title text-2xl text-slate-800">Summary</h2>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div class="stat bg-slate-50 rounded-lg">
                      <div class="stat-title">Income</div>
                      <div class="stat-value text-lg">{formatCurrency(summary.totalIncome)}</div>
                    </div>
                    <div class="stat bg-slate-50 rounded-lg">
                      <div class="stat-title">Assigned</div>
                      <div class="stat-value text-lg">{formatCurrency(summary.totalAssigned)}</div>
                    </div>
                    <div class="stat bg-slate-50 rounded-lg">
                      <div class="stat-title">Unassigned</div>
                      <div class={`stat-value text-lg ${summary.unassigned === 0 ? "text-emerald-600" : "text-orange-600"}`}>
                        {formatCurrency(summary.unassigned)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div class="card bg-white shadow-xl">
                <div class="card-body items-center text-center py-12">
                  <h2 class="card-title text-2xl text-slate-600">No Active Budget Period</h2>
                  <p class="text-slate-500">
                    Create a budget period to start assigning your income.
                  </p>
                  <a href={url("/settings")} class="btn btn-primary mt-4">Configure Budget Period</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer class="bg-slate-800 text-slate-400 p-4 mt-12">
        <div class="max-w-7xl mx-auto text-center text-sm">
          Phase 1: Auth-Less Development Mode
        </div>
      </footer>
    </div>
  );
});

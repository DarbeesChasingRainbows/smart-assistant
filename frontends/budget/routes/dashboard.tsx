import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";
import type {
  BudgetSummary,
  CategoryBalance,
  CategoryGroup,
} from "../types/api.ts";
import { Navigation } from "../components/Navigation.tsx";
import BudgetAssignmentIsland from "../islands/BudgetAssignment.tsx";

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
  budgetSummary: BudgetSummary | null;
  accounts: AccountSummaryDto[];
  upcomingBills: UpcomingBillDto[];
  goals: BudgetGoalDto[];
  categoryBalances: CategoryBalance[];
}

interface DashboardData {
  dashboard: BudgetDashboardDto | null;
  categories: CategoryGroup[];
  assignments: Record<string, number>;
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
      const [dashboardRes, categoriesRes] = await Promise.all([
        fetch(
          `${normalizedBase}/v1/budget/dashboard?familyId=${
            encodeURIComponent(familyId)
          }`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `${normalizedBase}/v1/budget/category-groups?familyId=${
            encodeURIComponent(familyId)
          }`,
          { headers: { Accept: "application/json" } },
        ),
      ]);

      if (!dashboardRes.ok) {
        return {
          data: {
            dashboard: null,
            categories: [],
            assignments: {},
            error:
              `Backend error (${dashboardRes.status}) loading budget dashboard`,
          },
        };
      }

      const dashboard: BudgetDashboardDto = await dashboardRes.json();
      const categories: CategoryGroup[] = categoriesRes.ok
        ? await categoriesRes.json()
        : [];

      let assignments: Record<string, number> = {};
      if (dashboard.currentPayPeriod) {
        const assignRes = await fetch(
          `${normalizedBase}/v1/budget/assignments?payPeriodKey=${dashboard.currentPayPeriod.key}`,
          { headers: { Accept: "application/json" } },
        );
        if (assignRes.ok) {
          const assignList: { categoryKey: string; assignedAmount: number }[] =
            await assignRes.json();
          // Map to Record<string, number>
          assignments = assignList.reduce(
            (acc, a) => ({ ...acc, [a.categoryKey]: a.assignedAmount }),
            {},
          );
        }
      }

      return { data: { dashboard, categories, assignments } };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return {
        data: {
          dashboard: null,
          categories: [],
          assignments: {},
          error: "Could not connect to backend",
        },
      };
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
  const { dashboard, categories, assignments, error } = props
    .data as DashboardData;

  const period = dashboard?.currentPayPeriod ?? null;
  const summary = dashboard?.budgetSummary ?? null;
  const accounts = dashboard?.accounts ?? [];
  const upcomingBills = dashboard?.upcomingBills ?? [];
  const goals = dashboard?.goals ?? [];
  const categoryBalances = dashboard?.categoryBalances ?? [];
  const totalAccountBalance = accounts.reduce(
    (sum, a) => sum + (a.balance ?? 0),
    0,
  );

  // Calculate bills due soon (next 3 days) and overdue for reminders
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const billsDueSoon = upcomingBills.filter((bill) => {
    if (!bill.dueDate) return false;
    const dueDate = new Date(bill.dueDate);
    return dueDate >= now && dueDate <= threeDaysFromNow;
  });
  const overdueBills = upcomingBills.filter((bill) => {
    if (!bill.dueDate) return false;
    const dueDate = new Date(bill.dueDate);
    return dueDate < now;
  });
  const billsNeedingAttention = overdueBills.length + billsDueSoon.length;

  return (
    <>
      <Head>
        <title>Budget - Dashboard</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/dashboard">
        <div class="min-h-screen bg-[#0a0a0a]">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            {/* Period Badge - Mobile Friendly */}
            {period && (
              <div class="mb-4">
                <div class="inline-flex items-center gap-2 bg-[#00d9ff]/10 border border-[#00d9ff] rounded px-4 py-2 min-h-[44px]">
                  <span class="text-[#00d9ff] font-mono text-sm">
                    PERIOD:
                  </span>
                  <span class="text-white font-mono font-bold">
                    {period.name}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div class="alert alert-error mb-6 font-mono">
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
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Left Column - Accounts & Bills */}
              <div class="space-y-4 md:space-y-6">
                {/* Account Balances */}
                <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
                  <div class="card-body p-4 md:p-6">
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                      <h2 class="text-base font-bold font-mono text-white flex items-center gap-2">
                        <span class="text-[#00d9ff]">[</span>
                        <span>ACCOUNTS</span>
                        <span class="text-[#00d9ff]">]</span>
                      </h2>
                      <span class="text-xl md:text-2xl font-bold font-mono text-[#00ff88]">
                        {formatCurrency(totalAccountBalance)}
                      </span>
                    </div>
                    <div class="divide-y divide-[#333]">
                      {accounts.map((account) => (
                        <div
                          key={account.accountKey}
                          class="py-3 flex justify-between items-center gap-2"
                        >
                          <div class="flex-1 min-w-0">
                            <div class="font-medium text-white truncate">
                              {account.accountName}
                            </div>
                            <div class="text-xs text-[#888] font-mono">
                              {account.accountType}
                            </div>
                          </div>
                          <div
                            class={`font-semibold font-mono text-sm md:text-base whitespace-nowrap ${
                              account.balance >= 0
                                ? "text-[#00ff88]"
                                : "text-red-500"
                            }`}
                          >
                            {formatCurrency(account.balance)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <a
                      href={url("/accounts")}
                      class="btn btn-ghost btn-sm min-h-[44px] mt-2 border border-[#00d9ff]/30 hover:border-[#00d9ff] text-[#00d9ff] font-mono"
                    >
                      <span class="mr-2">▶</span>Manage Accounts
                    </a>
                  </div>
                </div>

                {/* Upcoming Bills */}
                <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
                  <div class="card-body p-4 md:p-6">
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <h2 class="text-base font-bold font-mono text-white flex items-center gap-2">
                        <span class="text-[#00d9ff]">[</span>
                        <span>BILLS</span>
                        <span class="text-[#00d9ff]">]</span>
                      </h2>
                      {billsNeedingAttention > 0 && (
                        <span
                          class={`badge font-mono text-[10px] ${
                            overdueBills.length > 0
                              ? "badge-error border-red-500/50"
                              : "bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40"
                          }`}
                        >
                          {billsNeedingAttention} ALERT
                        </span>
                      )}
                    </div>

                    {/* Bill Reminder Summary */}
                    {(overdueBills.length > 0 || billsDueSoon.length > 0) && (
                      <div class="alert bg-[#ffb000]/10 border border-[#ffb000]/30 mb-3 py-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="stroke-current shrink-0 h-5 w-5 text-[#ffb000]"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span class="text-xs font-mono text-[#ffb000]">
                          {overdueBills.length > 0 && (
                            <span class="font-bold uppercase">
                              {overdueBills.length} OVERDUE
                            </span>
                          )}
                          {overdueBills.length > 0 && billsDueSoon.length > 0 &&
                            " • "}
                          {billsDueSoon.length > 0 && (
                            <span class="uppercase">
                              {billsDueSoon.length} DUE SOON
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {upcomingBills.length === 0
                      ? (
                        <p class="text-[#888] text-sm font-mono">
                          No bills due in the next 14 days
                        </p>
                      )
                      : (
                        <div class="divide-y divide-[#333]">
                          {upcomingBills.slice(0, 5).map((bill) => {
                            const dueDate = bill.dueDate
                              ? new Date(bill.dueDate)
                              : null;
                            const isOverdue = dueDate && dueDate < new Date();
                            const isDueSoon = dueDate && !isOverdue &&
                              dueDate <=
                                new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                            return (
                              <div
                                key={bill.billKey}
                                class={`py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 ${
                                  isOverdue
                                    ? "bg-red-500/10 border border-red-500/30 -mx-4 px-4 rounded"
                                    : isDueSoon
                                    ? "bg-[#ffb000]/10 border border-[#ffb000]/30 -mx-4 px-4 rounded"
                                    : ""
                                }`}
                              >
                                <div class="flex-1 min-w-0">
                                  <div class="font-medium text-white flex items-center gap-2 flex-wrap">
                                    <span class="truncate">
                                      {bill.billName}
                                    </span>
                                    {bill.isAutoPay && (
                                      <span class="badge badge-xs bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/40 font-mono">
                                        AUTO
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span class="badge badge-xs badge-error font-mono">
                                        OVERDUE
                                      </span>
                                    )}
                                    {isDueSoon && !isOverdue && (
                                      <span class="badge badge-xs bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40 font-mono">
                                        DUE SOON
                                      </span>
                                    )}
                                  </div>
                                  <div class="text-xs text-[#888] mt-1 font-mono">
                                    {dueDate?.toLocaleDateString()}
                                    {" • "}
                                    {bill.accountName}
                                  </div>
                                </div>
                                <div
                                  class={`font-semibold font-mono text-sm sm:text-base whitespace-nowrap ${
                                    isOverdue
                                      ? "text-red-400"
                                      : isDueSoon
                                      ? "text-[#ffb000]"
                                      : "text-white"
                                  }`}
                                >
                                  {formatCurrency(bill.amount)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    <a
                      href={url("/bills")}
                      class="btn btn-ghost btn-sm min-h-[44px] mt-2 border border-[#00d9ff]/30 hover:border-[#00d9ff] text-[#00d9ff] font-mono"
                    >
                      <span class="mr-2">▶</span>Manage Bills
                    </a>
                  </div>
                </div>

                {/* Goals Progress */}
                <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
                  <div class="card-body p-4 md:p-6">
                    <h2 class="text-base font-bold font-mono text-white flex items-center gap-2 mb-3">
                      <span class="text-[#00d9ff]">[</span>
                      <span>GOALS</span>
                      <span class="text-[#00d9ff]">]</span>
                    </h2>
                    {goals.length === 0
                      ? (
                        <p class="text-[#888] text-sm font-mono">
                          No active goals
                        </p>
                      )
                      : (
                        <div class="space-y-4">
                          {goals.slice(0, 3).map((goal) => {
                            const percent = goal.targetAmount > 0
                              ? Math.min(
                                100,
                                (goal.currentAmount / goal.targetAmount) * 100,
                              )
                              : 0;
                            return (
                              <div key={goal.goalKey}>
                                <div class="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm mb-2">
                                  <span class="font-medium text-white font-mono truncate">
                                    {goal.goalName}
                                  </span>
                                  <span class="text-[#888] font-mono text-xs sm:text-sm whitespace-nowrap">
                                    {formatCurrency(goal.currentAmount)} /{" "}
                                    {formatCurrency(goal.targetAmount)}
                                  </span>
                                </div>
                                <div class="w-full bg-[#333] h-2 border border-[#444]">
                                  <div
                                    class="bg-[#00ff88] h-full transition-all"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    <a
                      href={url("/goals")}
                      class="btn btn-ghost btn-sm min-h-[44px] mt-2 border border-[#00d9ff]/30 hover:border-[#00d9ff] text-[#00d9ff] font-mono"
                    >
                      <span class="mr-2">▶</span>Manage Goals
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Column - Budget Assignment (2 cols wide) */}
              <div class="lg:col-span-2">
                {summary && period && categories.length > 0
                  ? (
                    <BudgetAssignmentIsland
                      categories={categories}
                      assignments={assignments}
                      summary={summary}
                      payPeriodKey={period.key}
                      categoryBalances={categoryBalances}
                    />
                  )
                  : (
                    <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
                      <div class="card-body items-center text-center py-12 p-4">
                        <h2 class="text-xl md:text-2xl text-white font-mono mb-4">
                          <span class="text-[#ffb000]">[!</span>{" "}
                          NO ACTIVE PERIOD{" "}
                          <span class="text-[#ffb000]">!]</span>
                        </h2>
                        <p class="text-[#888] font-mono text-sm mb-6">
                          Create a budget period to start assigning your income.
                        </p>
                        <a
                          href={url("/settings")}
                          class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
                        >
                          <span class="mr-2">▶</span>Configure Budget Period
                        </a>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </main>
        </div>
      </Navigation>
    </>
  );
});

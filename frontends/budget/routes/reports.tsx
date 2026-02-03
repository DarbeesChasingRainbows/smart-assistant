import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type {
  CategoryBalance,
  CategoryGroup,
  Goal,
  Transaction,
} from "../types/api.ts";
import { Navigation } from "../components/Navigation.tsx";
import ReportsManager from "../islands/ReportsManager.tsx";

interface PayPeriodDto {
  key: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalIncome: number;
}

interface ReportsData {
  currentPeriod: PayPeriodDto | null;
  recentPeriods: PayPeriodDto[];
  categoryBalances: CategoryBalance[];
  categoryGroups: CategoryGroup[];
  transactions: Transaction[];
  goals: Goal[];
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
      // Fetch dashboard data (includes current period and category balances)
      const [dashboardRes, categoriesRes, transactionsRes, goalsRes, periodsRes] = await Promise.all([
        fetch(
          `${normalizedBase}/v1/budget/dashboard?familyId=${encodeURIComponent(familyId)}`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `${normalizedBase}/v1/budget/category-groups?familyId=${encodeURIComponent(familyId)}`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `${normalizedBase}/v1/budget/transactions?familyId=${encodeURIComponent(familyId)}&limit=500`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `${normalizedBase}/v1/budget/goals?familyId=${encodeURIComponent(familyId)}`,
          { headers: { Accept: "application/json" } },
        ),
        fetch(
          `${normalizedBase}/v1/budget/pay-periods?familyId=${encodeURIComponent(familyId)}`,
          { headers: { Accept: "application/json" } },
        ),
      ]);

      if (!dashboardRes.ok) {
        return {
          data: {
            currentPeriod: null,
            recentPeriods: [],
            categoryBalances: [],
            categoryGroups: [],
            transactions: [],
            goals: [],
            error: `Backend error (${dashboardRes.status}) loading reports data`,
          },
        };
      }

      const dashboard = await dashboardRes.json();
      const categoryGroups: CategoryGroup[] = categoriesRes.ok ? await categoriesRes.json() : [];
      const transactions: Transaction[] = transactionsRes.ok ? await transactionsRes.json() : [];
      const goals: Goal[] = goalsRes.ok ? await goalsRes.json() : [];
      const periods: PayPeriodDto[] = periodsRes.ok ? await periodsRes.json() : [];

      return {
        data: {
          currentPeriod: dashboard.currentPayPeriod,
          recentPeriods: periods.slice(0, 12), // Last 12 periods for trends
          categoryBalances: dashboard.categoryBalances || [],
          categoryGroups,
          transactions,
          goals,
        },
      };
    } catch (error) {
      console.error("Error fetching reports data:", error);
      return {
        data: {
          currentPeriod: null,
          recentPeriods: [],
          categoryBalances: [],
          categoryGroups: [],
          transactions: [],
          goals: [],
          error: "Could not connect to backend",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function Reports(props) {
  const {
    currentPeriod,
    recentPeriods,
    categoryBalances,
    categoryGroups,
    transactions,
    goals,
    error,
  } = props.data as ReportsData;

  return (
    <>
      <Head>
        <title>Budget - Reports & Analytics</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      </Head>

      <Navigation currentPath="/reports">
        <div class="min-h-screen bg-theme-primary">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            {/* Page Header */}
            <div class="mb-6">
              <h1 class="text-2xl font-bold font-mono text-theme-primary flex items-center gap-2">
                <span class="text-accent-cyan">[</span>
                <span>REPORTS & ANALYTICS</span>
                <span class="text-accent-cyan">]</span>
              </h1>
              {currentPeriod && (
                <p class="text-theme-secondary font-mono text-sm mt-1">
                  Current Period: {currentPeriod.name}
                </p>
              )}
            </div>

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

            <ReportsManager
              currentPeriod={currentPeriod}
              recentPeriods={recentPeriods}
              categoryBalances={categoryBalances}
              categoryGroups={categoryGroups}
              transactions={transactions}
              goals={goals}
            />
          </main>
        </div>
      </Navigation>
    </>
  );
});

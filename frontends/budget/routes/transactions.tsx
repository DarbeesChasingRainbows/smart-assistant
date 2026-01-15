import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";
import type {
  Account,
  Category,
  CategoryBalance,
  CategoryGroup,
  PayPeriod,
  Transaction,
} from "../types/api.ts";
import { Navigation } from "../components/Navigation.tsx";
import TransactionsManager from "../islands/TransactionsManager.tsx";
import TransactionImportIsland from "../islands/TransactionImportIsland.tsx";
import TransactionExportIsland from "../islands/TransactionExportIsland.tsx";

async function fetchJsonWithTimeout<T>(
  input: string,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; data?: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json() as T;
    return { ok: true, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function getApiBase(): string {
  const base = (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(
    /\/$/,
    "",
  );
  // Ensure we have the full path including /v1/budget
  return base.endsWith("/v1/budget") ? base : `${base}/v1/budget`;
}

interface TransactionsData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  categoryBalances: CategoryBalance[];
  currentPeriod: PayPeriod | null;
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const started = Date.now();
      const apiBase = getApiBase();
      const timeoutMs = 10_000;

      console.log(JSON.stringify({
        level: "info",
        msg: "budget:transactions:fetch:start",
        apiBase,
      }));

      const [accountsR, categoryGroupsR, periodR, txR] = await Promise.all([
        fetchJsonWithTimeout<Account[]>(`${apiBase}/accounts`, timeoutMs),
        fetchJsonWithTimeout<CategoryGroup[]>(
          `${apiBase}/category-groups`,
          timeoutMs,
        ),
        fetchJsonWithTimeout<PayPeriod | null>(
          `${apiBase}/pay-periods/current`,
          timeoutMs,
        ),
        fetchJsonWithTimeout<Transaction[]>(
          `${apiBase}/transactions?limit=500`,
          timeoutMs,
        ),
      ]);

      console.log(JSON.stringify({
        level: "info",
        msg: "budget:transactions:fetch:responses",
        elapsedMs: Date.now() - started,
        statuses: {
          accounts: accountsR.status,
          categoryGroups: categoryGroupsR.status,
          currentPeriod: periodR.status,
          transactions: txR.status,
        },
      }));

      const accounts: Account[] = accountsR.ok ? (accountsR.data ?? []) : [];
      const categoryGroups: CategoryGroup[] = categoryGroupsR.ok
        ? (categoryGroupsR.data ?? [])
        : [];
      const currentPeriod: PayPeriod | null = periodR.ok
        ? (periodR.data ?? null)
        : null;
      const transactions: Transaction[] = txR.ok ? (txR.data ?? []) : [];
      const categories = categoryGroups.flatMap((g) => g.categories);

      // Fetch category balances if we have a current period
      let categoryBalances: CategoryBalance[] = [];
      if (currentPeriod) {
        const balStarted = Date.now();
        const balR = await fetchJsonWithTimeout<CategoryBalance[]>(
          `${apiBase}/budget/balances/${currentPeriod.id}`,
          timeoutMs,
        );
        console.log(JSON.stringify({
          level: "info",
          msg: "budget:transactions:fetch:balances",
          elapsedMs: Date.now() - balStarted,
          status: balR.status,
        }));
        if (balR.ok) categoryBalances = balR.data ?? [];
      }

      return {
        data: {
          transactions,
          accounts,
          categories,
          categoryGroups,
          categoryBalances,
          currentPeriod,
        },
      };
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return {
        data: {
          transactions: [],
          accounts: [],
          categories: [],
          categoryGroups: [],
          categoryBalances: [],
          currentPeriod: null,
          error: "Could not connect to backend",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function TransactionsPage(props) {
  const {
    transactions,
    accounts,
    categories,
    categoryGroups,
    categoryBalances,
    currentPeriod,
    error,
  } = props.data as TransactionsData;

  return (
    <>
      <Head>
        <title>Budget - Transactions</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/transactions">
        <div class="min-h-screen bg-[#0a0a0a]">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h1 class="text-2xl md:text-3xl font-bold text-white font-mono flex items-center gap-2">
                <span class="text-[#00d9ff]">⚡</span>
                <span>TRANSACTIONS</span>
              </h1>
              <div class="flex gap-2 flex-wrap">
                <TransactionExportIsland
                  transactions={transactions}
                  accounts={accounts}
                  categories={categories}
                  categoryGroups={categoryGroups}
                />
                {accounts.length > 0 && (
                  <TransactionImportIsland
                    accountKey={accounts[0].accountKey ||
                      accounts[0].id?.toString() || ""}
                    onImportComplete={() => globalThis.location.reload()}
                  />
                )}
              </div>
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

            <TransactionsManager
              initialTransactions={transactions}
              accounts={accounts}
              categories={categories}
              categoryGroups={categoryGroups}
              categoryBalances={categoryBalances}
              currentPeriodId={currentPeriod?.id || null}
            />
          </main>
        </div>
      </Navigation>
    </>
  );
});

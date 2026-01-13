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
import TransactionsManager from "../islands/TransactionsManager.tsx";
import TransactionImportIsland from "../islands/TransactionImportIsland.tsx";

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
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Transactions</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <header class="bg-slate-800 text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <a
            href={url("/dashboard")}
            class="text-2xl font-bold hover:text-slate-300"
          >
            💰 Budget
          </a>
          <nav class="flex items-center gap-2">
            <a href={url("/dashboard")} class="btn btn-ghost btn-sm">
              Dashboard
            </a>
            <a href={url("/accounts")} class="btn btn-ghost btn-sm">Accounts</a>
            <a href={url("/transactions")} class="btn btn-primary btn-sm">
              Transactions
            </a>
            <a href={url("/receipts")} class="btn btn-ghost btn-sm">Receipts</a>
            <a href={url("/bills")} class="btn btn-ghost btn-sm">Bills</a>
            <a href={url("/goals")} class="btn btn-ghost btn-sm">Goals</a>
            <a href={url("/settings")} class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-slate-800">💸 Transactions</h1>
          {accounts.length > 0 && (
            <TransactionImportIsland
              accountKey={accounts[0].accountKey ||
                accounts[0].id?.toString() || ""}
              onImportComplete={() => globalThis.location.reload()}
            />
          )}
        </div>

        {error && (
          <div class="alert alert-error mb-6">
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
  );
});

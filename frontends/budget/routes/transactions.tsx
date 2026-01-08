import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { Account, Transaction, Category, CategoryGroup, PayPeriod, CategoryBalance } from "../types/api.ts";
import TransactionsManager from "../islands/TransactionsManager.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(/\/$/, "");
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
      const apiBase = getApiBase();
      const [accountsRes, categoriesRes, periodRes, txRes] = await Promise.all([
        fetch(`${apiBase}/accounts`),
        fetch(`${apiBase}/categories`),
        fetch(`${apiBase}/payperiods/current`),
        fetch(`${apiBase}/transactions/family/1?limit=500`),
      ]);

      const accounts: Account[] = accountsRes.ok ? await accountsRes.json() : [];
      const categoryGroups: CategoryGroup[] = categoriesRes.ok ? await categoriesRes.json() : [];
      const currentPeriod: PayPeriod | null = periodRes.ok ? await periodRes.json() : null;
      const transactions: Transaction[] = txRes.ok ? await txRes.json() as Transaction[] : [];
      const categories = categoryGroups.flatMap(g => g.categories);

      // Fetch category balances if we have a current period
      let categoryBalances: CategoryBalance[] = [];
      if (currentPeriod) {
        const balRes = await fetch(`${apiBase}/budget/balances/${currentPeriod.id}`);
        if (balRes.ok) categoryBalances = await balRes.json();
      }

      return { data: { transactions, accounts, categories, categoryGroups, categoryBalances, currentPeriod } };
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return { data: { transactions: [], accounts: [], categories: [], categoryGroups: [], categoryBalances: [], currentPeriod: null, error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function TransactionsPage(props) {
  const { transactions, accounts, categories, categoryGroups, categoryBalances, currentPeriod, error } = props.data as TransactionsData;

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Transactions</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css" rel="stylesheet" type="text/css" />
      </Head>

      <header class="bg-slate-800 text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/dashboard" class="text-2xl font-bold hover:text-slate-300">
            💰 Budget
          </a>
          <nav class="flex items-center gap-2">
            <a href="/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
            <a href="/accounts" class="btn btn-ghost btn-sm">Accounts</a>
            <a href="/transactions" class="btn btn-primary btn-sm">Transactions</a>
            <a href="/receipts" class="btn btn-ghost btn-sm">Receipts</a>
            <a href="/bills" class="btn btn-ghost btn-sm">Bills</a>
            <a href="/goals" class="btn btn-ghost btn-sm">Goals</a>
            <a href="/settings" class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold text-slate-800 mb-6">💸 Transactions</h1>
        
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

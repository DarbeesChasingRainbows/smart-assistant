import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { Bill, Category, CategoryGroup } from "../types/api.ts";
import BillsManager from "../islands/BillsManager.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(/\/$/, "");
}

interface BillsData {
  bills: Bill[];
  categories: CategoryGroup[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const apiBase = getApiBase();
      const [billsRes, categoriesRes] = await Promise.all([
        fetch(`${apiBase}/bills?activeOnly=false`),
        fetch(`${apiBase}/categories`),
      ]);
      const bills: Bill[] = billsRes.ok ? await billsRes.json() : [];
      const categories: CategoryGroup[] = categoriesRes.ok ? await categoriesRes.json() : [];
      return { data: { bills, categories } };
    } catch (error) {
      console.error("Error fetching bills:", error);
      return { data: { bills: [], categories: [], error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function BillsPage(props) {
  const { bills, categories, error } = props.data as BillsData;

  // Flatten categories for dropdown
  const flatCategories: Category[] = categories.flatMap(g => g.categories);

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Bills</title>
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
            <a href="/transactions" class="btn btn-ghost btn-sm">Transactions</a>
            <a href="/bills" class="btn btn-primary btn-sm">Bills</a>
            <a href="/goals" class="btn btn-ghost btn-sm">Goals</a>
            <a href="/settings" class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold text-slate-800 mb-6">📅 Recurring Bills</h1>
        
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <BillsManager initialBills={bills} categories={flatCategories} />
      </main>
    </div>
  );
});

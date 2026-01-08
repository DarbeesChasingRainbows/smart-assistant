import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { PayPeriod, CategoryGroup } from "../types/api.ts";
import SettingsManager from "../islands/SettingsManager.tsx";

function getApiBase(): string {
  const rawApiUrl = Deno.env.get("VITE_API_URL");
  const apiUrl = rawApiUrl || "http://localhost:5120/api";
  const normalizedBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  return `${normalizedBase}/v1/budget`;
}

interface SettingsData {
  currentPeriod: PayPeriod | null;
  allPeriods: PayPeriod[];
  categories: CategoryGroup[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const apiBase = getApiBase();
      const [periodRes, allPeriodsRes, categoriesRes] = await Promise.all([
        fetch(`${apiBase}/pay-periods/current`),
        fetch(`${apiBase}/pay-periods`),
        fetch(`${apiBase}/category-groups`),
      ]);

      const currentPeriod: PayPeriod | null = periodRes.ok ? await periodRes.json() : null;
      const allPeriods: PayPeriod[] = allPeriodsRes.ok ? await allPeriodsRes.json() : [];
      const categories: CategoryGroup[] = categoriesRes.ok ? await categoriesRes.json() : [];

      return { data: { currentPeriod, allPeriods, categories } };
    } catch (error) {
      console.error("Error fetching settings:", error);
      return { data: { currentPeriod: null, allPeriods: [], categories: [], error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function SettingsPage(props) {
  const { currentPeriod, allPeriods, categories, error } = props.data as SettingsData;

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Settings</title>
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
            <a href="/bills" class="btn btn-ghost btn-sm">Bills</a>
            <a href="/goals" class="btn btn-ghost btn-sm">Goals</a>
            <a href="/settings" class="btn btn-primary btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold text-slate-800 mb-6">⚙️ Settings</h1>
        
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <SettingsManager 
          currentPeriod={currentPeriod}
          allPeriods={allPeriods}
          categories={categories}
        />
      </main>
    </div>
  );
});

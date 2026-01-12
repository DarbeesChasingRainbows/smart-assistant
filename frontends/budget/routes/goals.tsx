import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";
import type { Goal } from "../types/api.ts";
import GoalsManager from "../islands/GoalsManager.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(/\/$/, "");
}

interface GoalsData {
  goals: Goal[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/goals?includeCompleted=true`);
      const goals: Goal[] = res.ok ? await res.json() : [];
      return { data: { goals } };
    } catch (error) {
      console.error("Error fetching goals:", error);
      return { data: { goals: [], error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function GoalsPage(props) {
  const { goals, error } = props.data as GoalsData;

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Goals</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css" rel="stylesheet" type="text/css" />
      </Head>

      <header class="bg-slate-800 text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <a href={url("/dashboard")} class="text-2xl font-bold hover:text-slate-300">
            💰 Budget
          </a>
          <nav class="flex items-center gap-2">
            <a href={url("/dashboard")} class="btn btn-ghost btn-sm">Dashboard</a>
            <a href={url("/accounts")} class="btn btn-ghost btn-sm">Accounts</a>
            <a href={url("/transactions")} class="btn btn-ghost btn-sm">Transactions</a>
            <a href={url("/bills")} class="btn btn-ghost btn-sm">Bills</a>
            <a href={url("/goals")} class="btn btn-primary btn-sm">Goals</a>
            <a href={url("/settings")} class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold text-slate-800 mb-6">🎯 Goals</h1>
        
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <GoalsManager initialGoals={goals} />
      </main>
    </div>
  );
});

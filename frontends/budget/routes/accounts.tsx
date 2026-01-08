import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import AddAccountModalIsland from "../islands/AddAccountModalIsland.tsx";

interface BudgetAccountSummary {
  accountKey: string;
  accountName: string;
  accountType: string;
  balance: number;
  unclearedCount: number;
}

interface AccountsData {
  accounts: BudgetAccountSummary[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const rawApiUrl = Deno.env.get("VITE_API_URL");
      const apiUrl = rawApiUrl || "http://localhost:5120/api";
      const normalizedBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

      const res = await fetch(
        `${normalizedBase}/v1/budget/accounts?familyId=default`,
        { headers: { Accept: "application/json" } },
      );
      const accounts: BudgetAccountSummary[] = res.ok ? await res.json() : [];
      return { data: { accounts } };
    } catch (error) {
      console.error("Error fetching accounts:", error);
      return { data: { accounts: [], error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function AccountsPage(props) {
  const { accounts, error } = props.data as AccountsData;

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Accounts</title>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css" rel="stylesheet" type="text/css" />
      </Head>

      <header class="bg-slate-800 text-white p-4 shadow-lg">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/dashboard" class="text-2xl font-bold hover:text-slate-300">
            💰 Budget
          </a>
          <nav class="flex items-center gap-2">
            <a href="/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
            <a href="/accounts" class="btn btn-primary btn-sm">Accounts</a>
            <a href="/transactions" class="btn btn-ghost btn-sm">Transactions</a>
            <a href="/bills" class="btn btn-ghost btn-sm">Bills</a>
            <a href="/goals" class="btn btn-ghost btn-sm">Goals</a>
            <a href="/settings" class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <div class="flex items-start justify-between gap-4 mb-6">
          <h1 class="text-3xl font-bold text-slate-800">💳 Accounts</h1>
          <AddAccountModalIsland familyId="default" />
        </div>
        
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <div class="bg-white rounded-2xl shadow-lg p-6">
          {accounts.length === 0
            ? <div class="text-slate-600">No accounts found.</div>
            : (
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th class="text-right">Balance</th>
                      <th class="text-right">Uncleared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.accountKey}>
                        <td class="font-medium">{a.accountName}</td>
                        <td>{a.accountType}</td>
                        <td class="text-right">{a.balance}</td>
                        <td class="text-right">{a.unclearedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </main>
    </div>
  );
});

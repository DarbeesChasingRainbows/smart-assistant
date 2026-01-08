import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { Receipt, Transaction, Account } from "../types/api.ts";
import ReceiptsManager from "../islands/ReceiptsManager.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(/\/$/, "");
}

interface ReceiptsData {
  receipts: Receipt[];
  unmatchedTransactions: Transaction[];
  accounts: Account[];
  linkTransactionId: string | null;
  error?: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const linkTransactionId = url.searchParams.get("link");
    
    try {
      const apiBase = getApiBase();
      const [receiptsRes, txRes, accountsRes] = await Promise.all([
        fetch(`${apiBase}/receipts/family/1`),
        fetch(`${apiBase}/transactions/family/1?limit=100`),
        fetch(`${apiBase}/accounts`),
      ]);

      const receipts: Receipt[] = receiptsRes.ok ? await receiptsRes.json() : [];
      const allTransactions: Transaction[] = txRes.ok ? await txRes.json() : [];
      const accounts: Account[] = accountsRes.ok ? await accountsRes.json() : [];
      
      // Filter to transactions without receipts (for matching)
      const unmatchedTransactions = allTransactions.filter(t => t.amount < 0);

      return { data: { receipts, unmatchedTransactions, accounts, linkTransactionId } };
    } catch (error) {
      console.error("Error fetching receipts:", error);
      return { data: { receipts: [], unmatchedTransactions: [], accounts: [], linkTransactionId: null, error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function ReceiptsPage(props) {
  const { receipts, unmatchedTransactions, accounts, linkTransactionId, error } = props.data as ReceiptsData;

  return (
    <div class="min-h-screen bg-slate-100">
      <Head>
        <title>Budget - Receipts</title>
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
            <a href="/receipts" class="btn btn-primary btn-sm">Receipts</a>
            <a href="/bills" class="btn btn-ghost btn-sm">Bills</a>
            <a href="/goals" class="btn btn-ghost btn-sm">Goals</a>
            <a href="/settings" class="btn btn-ghost btn-sm">Settings</a>
          </nav>
        </div>
      </header>

      <main class="max-w-6xl mx-auto p-6">
        <h1 class="text-3xl font-bold text-slate-800 mb-6">🧾 Receipts</h1>
        
        {error && (
          <div class="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <ReceiptsManager 
          initialReceipts={receipts}
          unmatchedTransactions={unmatchedTransactions}
          accounts={accounts}
          linkTransactionId={linkTransactionId}
        />
      </main>
    </div>
  );
});

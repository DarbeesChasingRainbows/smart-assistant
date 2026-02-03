import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { Account, Receipt, Transaction } from "../types/api.ts";
import ReceiptsManager from "../islands/ReceiptsManager.tsx";
import { Navigation } from "../components/Navigation.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(
    /\/$/,
    "",
  );
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

      const receipts: Receipt[] = receiptsRes.ok
        ? await receiptsRes.json()
        : [];
      const allTransactions: Transaction[] = txRes.ok ? await txRes.json() : [];
      const accounts: Account[] = accountsRes.ok
        ? await accountsRes.json()
        : [];

      // Filter to transactions without receipts (for matching)
      const unmatchedTransactions = allTransactions.filter((t) => t.amount < 0);

      return {
        data: { receipts, unmatchedTransactions, accounts, linkTransactionId },
      };
    } catch (error) {
      console.error("Error fetching receipts:", error);
      return {
        data: {
          receipts: [],
          unmatchedTransactions: [],
          accounts: [],
          linkTransactionId: null,
          error: "Could not connect to backend",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function ReceiptsPage(props) {
  const {
    receipts,
    unmatchedTransactions,
    accounts,
    linkTransactionId,
    error,
  } = props.data as ReceiptsData;

  return (
    <>
      <Head>
        <title>Budget - Receipts</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/receipts">
        <div class="min-h-screen bg-theme-primary">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            <h1 class="text-2xl md:text-3xl font-bold text-theme-primary font-mono mb-6 flex items-center gap-3">
              <span class="text-accent-cyan">🧾</span>
              <span>RECEIPTS</span>
            </h1>

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

            <ReceiptsManager
              initialReceipts={receipts}
              unmatchedTransactions={unmatchedTransactions}
              accounts={accounts}
              linkTransactionId={linkTransactionId}
            />
          </main>
        </div>
      </Navigation>
    </>
  );
});

import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";
import { Navigation } from "../components/Navigation.tsx";
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
      const normalizedBase = apiUrl.endsWith("/")
        ? apiUrl.slice(0, -1)
        : apiUrl;

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <>
      <Head>
        <title>Budget - Accounts</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/accounts">
        <div class="min-h-screen bg-[#0a0a0a]">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <h1 class="text-2xl md:text-3xl font-bold text-white font-mono flex items-center gap-2">
                <span class="text-[#00d9ff]">$</span>
                <span>ACCOUNTS</span>
              </h1>
              <AddAccountModalIsland familyId="default" />
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

            {/* Total Balance Card */}
            <div class="card bg-[#1a1a1a] shadow-xl border border-[#333] mb-6">
              <div class="card-body p-4 md:p-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 class="text-sm md:text-lg text-[#888] font-mono">
                    TOTAL BALANCE
                  </h2>
                  <div class="text-2xl md:text-3xl font-bold text-white font-mono">
                    {formatCurrency(totalBalance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Accounts Table */}
            <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
              <div class="card-body p-0">
                {accounts.length === 0
                  ? (
                    <div class="text-[#888] font-mono p-8 text-center">
                      No accounts found.
                    </div>
                  )
                  : (
                    <div class="overflow-x-auto">
                      <table class="table table-sm w-full">
                        <thead>
                          <tr class="bg-[#0a0a0a] border-b-2 border-[#00d9ff]">
                            <th class="text-[#888] font-mono text-xs">NAME</th>
                            <th class="text-[#888] font-mono text-xs hidden sm:table-cell">
                              TYPE
                            </th>
                            <th class="text-right text-[#888] font-mono text-xs">
                              BALANCE
                            </th>
                            <th class="text-right text-[#888] font-mono text-xs hidden md:table-cell">
                              UNCLEARED
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {accounts.map((a) => (
                            <tr
                              key={a.accountKey}
                              class="border-b border-[#333] hover:bg-[#1a1a1a]"
                            >
                              <td class="font-medium text-white">
                                {a.accountName}
                              </td>
                              <td class="text-[#888] font-mono hidden sm:table-cell">
                                {a.accountType}
                              </td>
                              <td
                                class={`text-right font-semibold font-mono ${
                                  a.balance >= 0
                                    ? "text-[#00ff88]"
                                    : "text-red-400"
                                }`}
                              >
                                {formatCurrency(a.balance)}
                              </td>
                              <td class="text-right text-[#888] font-mono hidden md:table-cell">
                                {a.unclearedCount > 0 && (
                                  <span class="badge bg-[#ffb000]/20 text-[#ffb000] border-[#ffb000]/40 badge-xs font-mono">
                                    {a.unclearedCount}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            </div>
          </main>
        </div>
      </Navigation>
    </>
  );
});

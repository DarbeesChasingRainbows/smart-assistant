import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import AccountsIsland from "../../islands/finance/AccountsIsland.tsx";

export default define.page(function FinanceAccountsPage() {
  return (
    <div>
      <Head>
        <title>Finance - Accounts - LifeOS</title>
      </Head>
      <FinanceShell activeTab="accounts">
        <AccountsIsland />
      </FinanceShell>
    </div>
  );
});

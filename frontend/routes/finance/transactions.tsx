import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import TransactionsIsland from "../../islands/finance/TransactionsIsland.tsx";

export default define.page(function FinanceTransactionsPage() {
  return (
    <div>
      <Head>
        <title>Finance - Transactions - LifeOS</title>
      </Head>
      <FinanceShell activeTab="transactions">
        <TransactionsIsland />
      </FinanceShell>
    </div>
  );
});

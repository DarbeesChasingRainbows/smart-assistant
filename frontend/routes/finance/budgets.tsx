import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import BudgetsIsland from "../../islands/finance/BudgetsIsland.tsx";

export default define.page(function FinanceBudgetsPage() {
  return (
    <div>
      <Head>
        <title>Finance - Budgets - LifeOS</title>
      </Head>
      <FinanceShell activeTab="budgets">
        <BudgetsIsland />
      </FinanceShell>
    </div>
  );
});

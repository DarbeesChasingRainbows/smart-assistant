import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import CategoriesIsland from "../../islands/finance/CategoriesIsland.tsx";

export default define.page(function FinanceCategoriesPage() {
  return (
    <div>
      <Head>
        <title>Finance - Categories - LifeOS</title>
      </Head>
      <FinanceShell activeTab="categories">
        <CategoriesIsland />
      </FinanceShell>
    </div>
  );
});

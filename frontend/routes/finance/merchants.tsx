import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import MerchantsIsland from "../../islands/finance/MerchantsIsland.tsx";

export default define.page(function FinanceMerchantsPage() {
  return (
    <div>
      <Head>
        <title>Finance - Merchants - LifeOS</title>
      </Head>
      <FinanceShell activeTab="merchants">
        <MerchantsIsland />
      </FinanceShell>
    </div>
  );
});

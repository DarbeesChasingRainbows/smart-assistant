import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { FinanceShell } from "../../components/FinanceShell.tsx";
import ReceiptsIsland from "../../islands/finance/ReceiptsIsland.tsx";

export default define.page(function FinanceReceiptsPage() {
  return (
    <div>
      <Head>
        <title>Finance - Receipts - LifeOS</title>
      </Head>
      <FinanceShell activeTab="receipts">
        <ReceiptsIsland />
      </FinanceShell>
    </div>
  );
});

import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { InventoryShell } from "../../components/InventoryShell.tsx";
import InventoryDashboardIsland from "../../islands/inventory/InventoryDashboardIsland.tsx";

export default define.page(function InventoryStockPage() {
  return (
    <div>
      <Head>
        <title>Inventory - Stock - LifeOS</title>
      </Head>
      <InventoryShell activeTab="stock">
        <InventoryDashboardIsland />
      </InventoryShell>
    </div>
  );
});

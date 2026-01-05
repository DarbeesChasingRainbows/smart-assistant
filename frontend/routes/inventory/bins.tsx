import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { InventoryShell } from "../../components/InventoryShell.tsx";
import BinsIsland from "../../islands/inventory/BinsIsland.tsx";

export default define.page(function InventoryBinsPage() {
  return (
    <div>
      <Head>
        <title>Inventory - Bins - LifeOS</title>
      </Head>
      <InventoryShell activeTab="bins">
        <BinsIsland />
      </InventoryShell>
    </div>
  );
});

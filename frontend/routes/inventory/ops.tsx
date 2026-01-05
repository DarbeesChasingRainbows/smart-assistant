import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { InventoryShell } from "../../components/InventoryShell.tsx";
import OpsIsland from "../../islands/inventory/OpsIsland.tsx";

export default define.page(function InventoryOpsPage() {
  return (
    <div>
      <Head>
        <title>Inventory - Ops - LifeOS</title>
      </Head>
      <InventoryShell activeTab="ops">
        <OpsIsland />
      </InventoryShell>
    </div>
  );
});

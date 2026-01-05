import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { InventoryShell } from "../../components/InventoryShell.tsx";
import LocationsIsland from "../../islands/inventory/LocationsIsland.tsx";

export default define.page(function InventoryLocationsPage() {
  return (
    <div>
      <Head>
        <title>Inventory - Locations - LifeOS</title>
      </Head>
      <InventoryShell activeTab="locations">
        <LocationsIsland />
      </InventoryShell>
    </div>
  );
});

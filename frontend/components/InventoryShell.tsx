import type { ComponentChildren } from "preact";

type InventoryTab = "stock" | "locations" | "bins" | "ops";

export function InventoryShell(
  { activeTab, children }: {
    activeTab: InventoryTab;
    children: ComponentChildren;
  },
) {
  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">📦</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Inventory</h1>
                <p class="text-sm text-gray-500">
                  Locations, bins, stock levels, adjustments, and transfers
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-4">
            <InventoryTabLink href="/inventory" active={activeTab === "stock"}>
              Stock
            </InventoryTabLink>
            <InventoryTabLink
              href="/inventory/locations"
              active={activeTab === "locations"}
            >
              Locations
            </InventoryTabLink>
            <InventoryTabLink
              href="/inventory/bins"
              active={activeTab === "bins"}
            >
              Bins
            </InventoryTabLink>
            <InventoryTabLink
              href="/inventory/ops"
              active={activeTab === "ops"}
            >
              Ops
            </InventoryTabLink>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function InventoryTabLink(
  { href, active, children }: {
    href: string;
    active: boolean;
    children: ComponentChildren;
  },
) {
  return (
    <a
      href={href}
      class={active
        ? "px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-medium"
        : "px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"}
    >
      {children}
    </a>
  );
}

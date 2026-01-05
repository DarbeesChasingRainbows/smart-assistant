import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type InventoryLocationDto,
  type InventorySkuDto,
  type InventoryStockLevelDto,
} from "../../lib/api.ts";

export default function StockIsland() {
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const stock = useSignal<InventoryStockLevelDto[]>([]);
  const skus = useSignal<InventorySkuDto[]>([]);
  const locations = useSignal<InventoryLocationDto[]>([]);

  const search = useSignal("");
  const filterLocationKey = useSignal("");

  const skuNameByKey = useComputed(() => {
    const map = new Map<string, string>();
    for (const s of skus.value) map.set(s.key, s.name);
    return map;
  });

  const locationNameByKey = useComputed(() => {
    const map = new Map<string, string>();
    for (const l of locations.value) map.set(l.key, l.name);
    return map;
  });

  const filtered = useComputed(() => {
    const term = search.value.trim().toLowerCase();
    let rows = stock.value;

    if (filterLocationKey.value) {
      rows = rows.filter((r) => r.locationKey === filterLocationKey.value);
    }

    if (term) {
      rows = rows.filter((r) => {
        const skuName = skuNameByKey.value.get(r.skuKey)?.toLowerCase() ?? "";
        return (
          r.skuKey.toLowerCase().includes(term) ||
          skuName.includes(term) ||
          r.locationKey.toLowerCase().includes(term)
        );
      });
    }

    return rows;
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [rows, skuList, locs] = await Promise.all([
        api.inventory.stock.list(),
        api.inventory.skus.list(),
        api.inventory.locations.list(),
      ]);
      stock.value = rows;
      skus.value = skuList;
      locations.value = locs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load stock";
    } finally {
      loading.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            class="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={search.value}
            onInput={(e) => search.value = (e.target as HTMLInputElement).value}
            placeholder="Search SKU or name..."
          />
          <select
            class="px-3 py-2 border border-gray-300 rounded-lg bg-white"
            value={filterLocationKey.value}
            onChange={(e) =>
              filterLocationKey.value = (e.target as HTMLSelectElement).value}
          >
            <option value="">All locations</option>
            {locations.value.map((l) => (
              <option key={l.key} value={l.key}>{l.name}</option>
            ))}
          </select>
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={load}
            disabled={loading.value}
          >
            {loading.value ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error.value && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && filtered.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No stock records</p>
          <p class="mt-2">
            Create an adjustment or transfer to generate stock levels
          </p>
        </div>
      )}

      {!loading.value && filtered.value.length > 0 && (
        <div class="bg-white border rounded-xl overflow-hidden">
          <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b text-xs font-semibold text-gray-500">
            <div class="col-span-4">SKU</div>
            <div class="col-span-3">Location</div>
            <div class="col-span-2 text-right">On hand</div>
            <div class="col-span-2 text-right">Available</div>
            <div class="col-span-1" />
          </div>
          <div class="divide-y">
            {filtered.value.map((r) => (
              <div key={r.key} class="grid grid-cols-12 gap-2 px-4 py-3">
                <div class="col-span-4">
                  <div class="font-medium text-gray-900">
                    {skuNameByKey.value.get(r.skuKey) ?? r.skuKey}
                  </div>
                  <div class="text-xs text-gray-400 font-mono">{r.skuKey}</div>
                </div>
                <div class="col-span-3">
                  <div class="text-gray-900">
                    {locationNameByKey.value.get(r.locationKey) ??
                      r.locationKey}
                  </div>
                  <div class="text-xs text-gray-400 font-mono">
                    {r.locationKey}
                  </div>
                </div>
                <div class="col-span-2 text-right font-semibold text-gray-900">
                  {r.onHand}
                </div>
                <div class="col-span-2 text-right text-gray-900">
                  {r.available}
                </div>
                <div class="col-span-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

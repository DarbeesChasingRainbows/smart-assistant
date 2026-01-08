import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type InventoryBinDto,
  type InventoryLocationDto,
  type InventorySkuDto,
  type InventoryStockLevelDto,
} from "../../lib/api.ts";

type StockIssueLevel = "out" | "low";

interface StockIssue {
  level: StockIssueLevel;
  skuKey: string;
  skuName: string;
  locationKey: string;
  locationName: string;
  available: number;
  onHand: number;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function InventoryDashboardIsland() {
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const stock = useSignal<InventoryStockLevelDto[]>([]);
  const skus = useSignal<InventorySkuDto[]>([]);
  const locations = useSignal<InventoryLocationDto[]>([]);
  const bins = useSignal<InventoryBinDto[]>([]);

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

  const normalizedQuery = useComputed(() => search.value.trim().toLowerCase());

  const filteredStock = useComputed(() => {
    let rows = stock.value;

    if (filterLocationKey.value) {
      rows = rows.filter((r) => r.locationKey === filterLocationKey.value);
    }

    const term = normalizedQuery.value;
    if (!term) return rows;

    return rows.filter((r) => {
      const skuName = skuNameByKey.value.get(r.skuKey)?.toLowerCase() ?? "";
      const locationName =
        locationNameByKey.value.get(r.locationKey)?.toLowerCase() ?? "";

      return (
        r.skuKey.toLowerCase().includes(term) ||
        skuName.includes(term) ||
        r.locationKey.toLowerCase().includes(term) ||
        locationName.includes(term)
      );
    });
  });

  const issues = useComputed(() => {
    // No min-stock exists in DTOs, so we apply a pragmatic default:
    // - available <= 0 => OUT
    // - 1..2 => LOW
    const out: StockIssue[] = [];
    const low: StockIssue[] = [];

    for (const r of stock.value) {
      const skuName = skuNameByKey.value.get(r.skuKey) ?? r.skuKey;
      const locationName = locationNameByKey.value.get(r.locationKey) ??
        r.locationKey;

      if (r.available <= 0) {
        out.push({
          level: "out",
          skuKey: r.skuKey,
          skuName,
          locationKey: r.locationKey,
          locationName,
          available: r.available,
          onHand: r.onHand,
        });
        continue;
      }

      if (r.available <= 2) {
        low.push({
          level: "low",
          skuKey: r.skuKey,
          skuName,
          locationKey: r.locationKey,
          locationName,
          available: r.available,
          onHand: r.onHand,
        });
      }
    }

    out.sort((a, b) => a.skuName.localeCompare(b.skuName));
    low.sort((a, b) => a.available - b.available);

    return { out, low };
  });

  const totalOnHand = useComputed(() => {
    return stock.value.reduce((sum, r) => sum + (r.onHand ?? 0), 0);
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [rows, skuList, locs, binList] = await Promise.all([
        api.inventory.stock.list(),
        api.inventory.skus.list(),
        api.inventory.locations.list(),
        api.inventory.bins.list(),
      ]);
      stock.value = rows;
      skus.value = skuList;
      locations.value = locs;
      bins.value = binList;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load inventory";
    } finally {
      loading.value = false;
    }
  }

  return (
    <div class="space-y-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-900">Dashboard</div>
          <div class="text-sm text-slate-500">
            Stock health, locations, bins, and operations
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a
            href="/inventory/ops"
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            + Adjustment / Transfer
          </a>
          <a
            href="/inventory/locations"
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            + Location
          </a>
          <a
            href="/inventory/bins"
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            + Bin
          </a>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            onClick={load}
            disabled={loading.value}
          >
            {loading.value ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error.value}
        </div>
      )}

      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">SKUs</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-slate-900">
              {formatNumber(skus.value.length)}
            </div>
            <div class="text-2xl">🏷️</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Locations</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-slate-900">
              {formatNumber(locations.value.length)}
            </div>
            <div class="text-2xl">📍</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Bins</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-slate-900">
              {formatNumber(bins.value.length)}
            </div>
            <div class="text-2xl">🗃️</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">Stock rows</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-slate-900">
              {formatNumber(stock.value.length)}
            </div>
            <div class="text-2xl">📦</div>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div class="text-xs text-slate-500">On hand (total)</div>
          <div class="mt-1 flex items-end justify-between">
            <div class="text-3xl font-bold text-slate-900">
              {formatNumber(totalOnHand.value)}
            </div>
            <div class="text-2xl">🧮</div>
          </div>
        </div>
      </div>

      {(issues.value.out.length > 0 || issues.value.low.length > 0) && (
        <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div class="flex items-start gap-3">
            <div class="text-2xl">⚠️</div>
            <div class="flex-1">
              <div class="font-semibold text-amber-900">Stock alerts</div>
              <div class="text-sm text-amber-800 mt-1">
                {issues.value.out.length} out of stock • {issues.value.low.length} low stock
              </div>

              <div class="mt-3 grid gap-2 md:grid-cols-2">
                {issues.value.out.slice(0, 4).map((i) => (
                  <div
                    key={`${i.locationKey}:${i.skuKey}`}
                    class="rounded-xl bg-white/70 border border-amber-200 px-3 py-2"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-medium text-amber-900 truncate">
                          {i.skuName}
                        </div>
                        <div class="text-xs text-amber-700 truncate">
                          {i.locationName}
                        </div>
                      </div>
                      <div class="text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded-full">
                        OUT
                      </div>
                    </div>
                  </div>
                ))}

                {issues.value.out.length === 0 && issues.value.low.slice(0, 4).map((i) => (
                  <div
                    key={`${i.locationKey}:${i.skuKey}`}
                    class="rounded-xl bg-white/70 border border-amber-200 px-3 py-2"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-medium text-amber-900 truncate">
                          {i.skuName}
                        </div>
                        <div class="text-xs text-amber-700 truncate">
                          {i.locationName}
                        </div>
                      </div>
                      <div class="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-1 rounded-full">
                        LOW ({i.available})
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div class="mt-3">
                <a href="/inventory/ops" class="text-sm font-medium text-amber-900 underline">
                  Fix via Ops →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="p-4 border-b border-slate-200">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-lg font-semibold text-slate-900">Stock</div>
              <div class="text-sm text-slate-500">
                Searchable snapshot of stock levels
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                class="w-full sm:w-72 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                value={search.value}
                onInput={(e) => search.value = (e.target as HTMLInputElement).value}
                placeholder="Search SKU, name, location..."
              />
              <select
                class="px-3 py-2 rounded-xl border border-slate-200 bg-white"
                value={filterLocationKey.value}
                onChange={(e) =>
                  filterLocationKey.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">All locations</option>
                {locations.value.map((l) => (
                  <option key={l.key} value={l.key}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading.value
          ? (
            <div class="flex justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          )
          : filteredStock.value.length === 0
          ? (
            <div class="text-center py-12">
              <div class="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                📦
              </div>
              <div class="mt-4 font-medium text-slate-700">No stock records</div>
              <div class="text-sm text-slate-500 mt-1">
                Create an adjustment or transfer to generate stock levels.
              </div>
            </div>
          )
          : (
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th class="text-left font-semibold px-4 py-3">SKU</th>
                    <th class="text-left font-semibold px-4 py-3">Location</th>
                    <th class="text-right font-semibold px-4 py-3">On hand</th>
                    <th class="text-right font-semibold px-4 py-3">Available</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  {filteredStock.value.map((r) => {
                    const skuName = skuNameByKey.value.get(r.skuKey) ?? r.skuKey;
                    const locationName = locationNameByKey.value.get(r.locationKey) ??
                      r.locationKey;
                    const availabilityTone = r.available <= 0
                      ? "text-red-700"
                      : r.available <= 2
                      ? "text-amber-700"
                      : "text-slate-900";

                    return (
                      <tr key={r.key} class="hover:bg-slate-50">
                        <td class="px-4 py-3">
                          <div class="font-medium text-slate-900">{skuName}</div>
                          <div class="text-xs text-slate-500 font-mono">{r.skuKey}</div>
                        </td>
                        <td class="px-4 py-3">
                          <div class="text-slate-900">{locationName}</div>
                          <div class="text-xs text-slate-500 font-mono">{r.locationKey}</div>
                        </td>
                        <td class="px-4 py-3 text-right font-semibold text-slate-900">
                          {r.onHand}
                        </td>
                        <td class={`px-4 py-3 text-right font-semibold ${availabilityTone}`}>
                          {r.available}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateInventoryAdjustmentRequest,
  type CreateInventoryTransferRequest,
  type InventoryLocationDto,
  type InventorySkuDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

const adjustmentSchema = z.object({
  locationKey: z.string().min(1, "Location is required"),
  skuKey: z.string().min(1, "SKU is required"),
  quantityDelta: z.coerce.number().finite().refine(
    (n) => n !== 0,
    "Cannot be 0",
  ),
  reason: z.string().min(1, "Reason is required"),
});

type AdjustmentInput = z.infer<typeof adjustmentSchema>;

const transferSchema = z.object({
  fromLocationKey: z.string().min(1, "From location is required"),
  toLocationKey: z.string().min(1, "To location is required"),
  skuKey: z.string().min(1, "SKU is required"),
  quantity: z.coerce.number().finite().positive("Quantity must be > 0"),
  reason: z.string().optional(),
});

type TransferInput = z.infer<typeof transferSchema>;

type Mode = "Adjustment" | "Transfer";

export default function OpsIsland() {
  const mode = useSignal<Mode>("Adjustment");

  const skus = useSignal<InventorySkuDto[]>([]);
  const locations = useSignal<InventoryLocationDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  const saving = useSignal(false);

  // shared
  const skuKey = useSignal("");

  // adjustment
  const locationKey = useSignal("");
  const quantityDelta = useSignal("0");
  const reason = useSignal("");

  // transfer
  const fromLocationKey = useSignal("");
  const toLocationKey = useSignal("");
  const quantity = useSignal("1");
  const transferReason = useSignal("");

  const fieldErrors = useSignal<Record<string, string[]>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const [skuList, locs] = await Promise.all([
        api.inventory.skus.list(),
        api.inventory.locations.list(),
      ]);
      skus.value = skuList;
      locations.value = locs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load ops data";
    } finally {
      loading.value = false;
    }
  }

  function clearMessages() {
    error.value = null;
    success.value = null;
  }

  async function submitAdjustment() {
    saving.value = true;
    clearMessages();
    fieldErrors.value = {};

    const parsed = adjustmentSchema.safeParse({
      locationKey: locationKey.value,
      skuKey: skuKey.value,
      quantityDelta: quantityDelta.value,
      reason: reason.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    const req: CreateInventoryAdjustmentRequest = {
      locationKey: parsed.data.locationKey,
      skuKey: parsed.data.skuKey,
      quantityDelta: parsed.data.quantityDelta,
      reason: parsed.data.reason,
    };

    try {
      await api.inventory.ops.adjustment(req);
      success.value = "Adjustment created";
      quantityDelta.value = "0";
      reason.value = "";
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create adjustment";
    } finally {
      saving.value = false;
    }
  }

  async function submitTransfer() {
    saving.value = true;
    clearMessages();
    fieldErrors.value = {};

    const parsed = transferSchema.safeParse({
      fromLocationKey: fromLocationKey.value,
      toLocationKey: toLocationKey.value,
      skuKey: skuKey.value,
      quantity: quantity.value,
      reason: transferReason.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    const req: CreateInventoryTransferRequest = {
      fromLocationKey: parsed.data.fromLocationKey,
      toLocationKey: parsed.data.toLocationKey,
      skuKey: parsed.data.skuKey,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
    };

    try {
      await api.inventory.ops.transfer(req);
      success.value = "Transfer created";
      quantity.value = "1";
      transferReason.value = "";
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create transfer";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex gap-2">
        <button
          type="button"
          class={mode.value === "Adjustment"
            ? "px-4 py-2 rounded-lg bg-blue-600 text-white"
            : "px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"}
          onClick={() => {
            mode.value = "Adjustment";
            clearMessages();
            fieldErrors.value = {};
          }}
        >
          Adjustment
        </button>
        <button
          type="button"
          class={mode.value === "Transfer"
            ? "px-4 py-2 rounded-lg bg-blue-600 text-white"
            : "px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"}
          onClick={() => {
            mode.value = "Transfer";
            clearMessages();
            fieldErrors.value = {};
          }}
        >
          Transfer
        </button>
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && (
        <div class="bg-white border rounded-xl p-5 space-y-4">
          <FormErrorSummary errors={Object.values(fieldErrors.value).flat()} />

          <FormField label="SKU" error={firstError(fieldErrors.value, "skuKey")}>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={skuKey.value}
              onChange={(e) =>
                skuKey.value = (e.target as HTMLSelectElement).value}
            >
              <option value="">Select SKU</option>
              {skus.value.map((s) => (
                <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
              ))}
            </select>
          </FormField>

          {mode.value === "Adjustment" && (
            <>
              <FormField label="Location" error={firstError(fieldErrors.value, "locationKey")}>
                <select
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  value={locationKey.value}
                  onChange={(e) =>
                    locationKey.value = (e.target as HTMLSelectElement).value}
                >
                  <option value="">Select location</option>
                  {locations.value.map((l) => (
                    <option key={l.key} value={l.key}>{l.name}</option>
                  ))}
                </select>
              </FormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Quantity delta"
                  error={firstError(fieldErrors.value, "quantityDelta")}
                  hint="Use negative to remove stock."
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={quantityDelta.value}
                    onInput={(e) =>
                      quantityDelta.value =
                        (e.target as HTMLInputElement).value}
                  />
                </FormField>

                <FormField label="Reason" error={firstError(fieldErrors.value, "reason")}>
                  <input
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={reason.value}
                    onInput={(e) =>
                      reason.value = (e.target as HTMLInputElement).value}
                    placeholder="e.g. Cycle count"
                  />
                </FormField>
              </div>

              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={submitAdjustment}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create adjustment"}
              </button>
            </>
          )}

          {mode.value === "Transfer" && (
            <>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="From location" error={firstError(fieldErrors.value, "fromLocationKey")}>
                  <select
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    value={fromLocationKey.value}
                    onChange={(e) =>
                      fromLocationKey.value =
                        (e.target as HTMLSelectElement).value}
                  >
                    <option value="">Select</option>
                    {locations.value.map((l) => (
                      <option key={l.key} value={l.key}>{l.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="To location" error={firstError(fieldErrors.value, "toLocationKey")}>
                  <select
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    value={toLocationKey.value}
                    onChange={(e) =>
                      toLocationKey.value =
                        (e.target as HTMLSelectElement).value}
                  >
                    <option value="">Select</option>
                    {locations.value.map((l) => (
                      <option key={l.key} value={l.key}>{l.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Quantity" error={firstError(fieldErrors.value, "quantity")}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={quantity.value}
                    onInput={(e) =>
                      quantity.value = (e.target as HTMLInputElement).value}
                  />
                </FormField>

                <FormField label="Reason" error={null} hint="Optional">
                  <input
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={transferReason.value}
                    onInput={(e) =>
                      transferReason.value =
                        (e.target as HTMLInputElement).value}
                    placeholder="e.g. Move to shop"
                  />
                </FormField>
              </div>

              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={submitTransfer}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create transfer"}
              </button>
            </>
          )}
        </div>
      )}

      <div class="text-sm text-gray-500">
        Tip: go to Stock tab to confirm balances updated.
      </div>
    </div>
  );
}

import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { z } from "zod";
import {
  api,
  type CreateOrUpdatePeriodBudgetRequest,
  type FinancialBudgetDto,
  type FinancialCategoryDto,
  type PayPeriodConfigDto,
  type PeriodBudgetSummaryDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

type PeriodType =
  | "Monthly"
  | "Weekly"
  | "BiWeekly"
  | "SemiMonthly"
  | "Custom"
  | "PayPeriod";

const PERIOD_TYPES: { value: PeriodType; label: string }[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Weekly", label: "Weekly" },
  { value: "BiWeekly", label: "Bi-Weekly (every 2 weeks)" },
  { value: "SemiMonthly", label: "Semi-Monthly (1st–15th, 16th–end)" },
  { value: "PayPeriod", label: "Pay Period(s)" },
  { value: "Custom", label: "Custom date range" },
];

const budgetLineSchema = z.object({
  categoryKey: z.string().min(1, "Category is required"),
  budgetedAmount: z.coerce.number().nonnegative("Must be >= 0"),
  rolloverAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export default function BudgetsIsland() {
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  // Period selection
  const periodType = useSignal<PeriodType>("Monthly");
  const startDate = useSignal(getMonthStart(new Date()));
  const endDate = useSignal(getMonthEnd(new Date()));
  const payPeriodCount = useSignal(1); // 1, 2, or 3 pay periods

  // Pay period config
  const payPeriodConfig = useSignal<PayPeriodConfigDto | null>(null);
  const showPayPeriodConfig = useSignal(false);
  const ppAnchorDate = useSignal("");
  const ppLengthDays = useSignal("14");
  const savingConfig = useSignal(false);

  // Budget summary
  const summary = useSignal<PeriodBudgetSummaryDto | null>(null);

  // Categories for picker
  const categories = useSignal<FinancialCategoryDto[]>([]);

  // Upsert modal
  const showUpsert = useSignal(false);
  const saving = useSignal(false);
  const categoryKey = useSignal("");
  const budgetedAmount = useSignal("0");
  const rolloverAmount = useSignal("0");
  const notes = useSignal("");
  const fieldErrors = useSignal<Record<string, string[]>>({});

  // Computed period label
  const periodLabel = useComputed(() => {
    const s = new Date(startDate.value);
    const e = new Date(endDate.value);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    return `${fmt(s)} – ${fmt(e)}`;
  });

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    loading.value = true;
    error.value = null;
    try {
      const [config, cats] = await Promise.all([
        api.finance.payPeriodConfig.get(),
        api.finance.categories.list(),
      ]);
      payPeriodConfig.value = config;
      ppAnchorDate.value = config.anchorDate.slice(0, 10);
      ppLengthDays.value = String(config.periodLengthDays);
      categories.value = cats;

      await loadSummary();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load";
    } finally {
      loading.value = false;
    }
  }

  async function loadSummary() {
    loading.value = true;
    error.value = null;
    try {
      summary.value = await api.finance.budgets.getPeriodSummary(
        startDate.value,
        endDate.value,
        periodType.value,
      );
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load budget";
      summary.value = null;
    } finally {
      loading.value = false;
    }
  }

  function applyPeriodType(type: PeriodType) {
    periodType.value = type;
    const today = new Date();

    if (type === "Monthly") {
      startDate.value = getMonthStart(today);
      endDate.value = getMonthEnd(today);
    } else if (type === "Weekly") {
      const start = getWeekStart(today);
      startDate.value = toDateStr(start);
      endDate.value = toDateStr(addDays(start, 6));
    } else if (type === "BiWeekly") {
      const start = getWeekStart(today);
      startDate.value = toDateStr(start);
      endDate.value = toDateStr(addDays(start, 13));
    } else if (type === "SemiMonthly") {
      const day = today.getDate();
      if (day <= 15) {
        startDate.value = toDateStr(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        endDate.value = toDateStr(
          new Date(today.getFullYear(), today.getMonth(), 15),
        );
      } else {
        startDate.value = toDateStr(
          new Date(today.getFullYear(), today.getMonth(), 16),
        );
        endDate.value = getMonthEnd(today);
      }
    } else if (type === "PayPeriod") {
      applyPayPeriods(payPeriodCount.value);
    }
    // Custom: leave dates as-is
  }

  function applyPayPeriods(count: number) {
    payPeriodCount.value = count;
    if (!payPeriodConfig.value) return;

    const anchor = new Date(payPeriodConfig.value.anchorDate);
    const len = payPeriodConfig.value.periodLengthDays;
    const today = new Date();

    // Find current pay period start
    const diff = Math.floor(
      (today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24),
    );
    const periodsElapsed = Math.floor(diff / len);
    let currentStart = addDays(anchor, periodsElapsed * len);

    // If today is before currentStart, go back one period
    if (currentStart > today) {
      currentStart = addDays(currentStart, -len);
    }

    startDate.value = toDateStr(currentStart);
    endDate.value = toDateStr(addDays(currentStart, len * count - 1));
  }

  async function savePayPeriodConfig() {
    savingConfig.value = true;
    error.value = null;
    try {
      const saved = await api.finance.payPeriodConfig.upsert({
        anchorDate: ppAnchorDate.value,
        periodLengthDays: Number(ppLengthDays.value),
      });
      payPeriodConfig.value = saved;
      showPayPeriodConfig.value = false;
      success.value = "Pay period config saved";
      setTimeout(() => success.value = null, 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to save config";
    } finally {
      savingConfig.value = false;
    }
  }

  function resetForm() {
    categoryKey.value = "";
    budgetedAmount.value = "0";
    rolloverAmount.value = "0";
    notes.value = "";
    fieldErrors.value = {};
  }

  async function submitUpsert() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};

    const parsed = budgetLineSchema.safeParse({
      categoryKey: categoryKey.value,
      budgetedAmount: budgetedAmount.value,
      rolloverAmount: rolloverAmount.value || undefined,
      notes: notes.value.trim() || undefined,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      saving.value = false;
      return;
    }

    const req: CreateOrUpdatePeriodBudgetRequest = {
      periodType: periodType.value,
      startDate: startDate.value,
      endDate: endDate.value,
      categoryKey: parsed.data.categoryKey,
      budgetedAmount: parsed.data.budgetedAmount,
      rolloverAmount: parsed.data.rolloverAmount,
      notes: parsed.data.notes,
    };

    try {
      await api.finance.budgets.upsertPeriod(req);
      await loadSummary();
      showUpsert.value = false;
      resetForm();
      success.value = "Budget line saved";
      setTimeout(() => success.value = null, 3000);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to save budget";
    } finally {
      saving.value = false;
    }
  }

  function categoryName(key: string) {
    return categories.value.find((c) => c.key === key)?.name ?? key;
  }

  return (
    <div class="space-y-4">
      {/* Period selector */}
      <div class="bg-white border rounded-xl p-4 space-y-3">
        <div class="flex flex-wrap gap-2">
          {PERIOD_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              class={periodType.value === pt.value
                ? "px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                : "px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"}
              onClick={() => applyPeriodType(pt.value)}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {periodType.value === "PayPeriod" && (
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-sm text-gray-600">Pay periods:</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                class={payPeriodCount.value === n
                  ? "px-3 py-1 rounded bg-blue-600 text-white text-sm"
                  : "px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"}
                onClick={() => applyPayPeriods(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              class="ml-2 text-sm text-blue-600 hover:underline"
              onClick={() => showPayPeriodConfig.value = true}
            >
              Configure pay period
            </button>
          </div>
        )}

        {(periodType.value === "Custom" || periodType.value === "PayPeriod") &&
          (
            <div class="flex flex-wrap gap-3 items-center">
              <label class="flex items-center gap-2 text-sm">
                <span class="text-gray-600">From:</span>
                <input
                  type="date"
                  class="px-2 py-1 border border-gray-300 rounded"
                  value={startDate.value}
                  onInput={(e) =>
                    startDate.value = (e.target as HTMLInputElement).value}
                />
              </label>
              <label class="flex items-center gap-2 text-sm">
                <span class="text-gray-600">To:</span>
                <input
                  type="date"
                  class="px-2 py-1 border border-gray-300 rounded"
                  value={endDate.value}
                  onInput={(e) =>
                    endDate.value = (e.target as HTMLInputElement).value}
                />
              </label>
            </div>
          )}

        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700 font-medium">
            {periodLabel.value}
          </div>
          <button
            type="button"
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            onClick={loadSummary}
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
      {success.value && (
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          {success.value}
        </div>
      )}

      {loading.value && (
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}

      {!loading.value && summary.value && (
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Budgeted"
              value={formatMoney(summary.value.totalBudgeted)}
            />
            <StatCard
              label="Spent"
              value={formatMoney(summary.value.totalSpent)}
            />
            <StatCard
              label="Available"
              value={formatMoney(summary.value.totalAvailable)}
            />
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => {
                showUpsert.value = true;
                resetForm();
              }}
            >
              + Set Budget Line
            </button>
          </div>

          <div class="bg-white border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b font-medium text-gray-900">
              Budget lines
            </div>
            <div class="divide-y">
              {summary.value.categories.length === 0 && (
                <div class="px-4 py-6 text-gray-500">
                  No budget lines yet. Add one to start.
                </div>
              )}
              {summary.value.categories.map((b) => (
                <BudgetLineRow
                  key={b.key}
                  budget={b}
                  categoryName={categoryName(b.categoryKey)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading.value && !summary.value && !error.value && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No budget data</p>
          <p class="mt-2">Select a period and click Refresh</p>
        </div>
      )}

      {/* Upsert modal */}
      {showUpsert.value && (
        <FormModal
          title="Budget line"
          subtitle={`Set budget for ${periodLabel.value}`}
          onClose={() => {
            if (saving.value) return;
            showUpsert.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showUpsert.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitUpsert}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Save"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={Object.values(fieldErrors.value).flat()} />

          <div class="space-y-3">
            <FormField
              label="Category"
              error={firstError(fieldErrors.value, "categoryKey")}
            >
              <select
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                value={categoryKey.value}
                onChange={(e) =>
                  categoryKey.value = (e.target as HTMLSelectElement).value}
              >
                <option value="">Select category</option>
                {categories.value.map((c) => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
            </FormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Budgeted amount"
                error={firstError(fieldErrors.value, "budgetedAmount")}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={budgetedAmount.value}
                  onInput={(e) =>
                    budgetedAmount.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
              <FormField label="Rollover amount" error={null} hint="Optional">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={rolloverAmount.value}
                  onInput={(e) =>
                    rolloverAmount.value = (e.target as HTMLInputElement).value}
                />
              </FormField>
            </div>

            <FormField label="Notes" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={notes.value}
                onInput={(e) =>
                  notes.value = (e.target as HTMLInputElement).value}
                placeholder="Optional"
              />
            </FormField>
          </div>
        </FormModal>
      )}

      {/* Pay period config modal */}
      {showPayPeriodConfig.value && (
        <FormModal
          title="Pay period configuration"
          subtitle="Set your pay period anchor date and length"
          onClose={() => {
            if (savingConfig.value) return;
            showPayPeriodConfig.value = false;
          }}
          disableClose={savingConfig.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (savingConfig.value) return;
                  showPayPeriodConfig.value = false;
                }}
                disabled={savingConfig.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={savePayPeriodConfig}
                disabled={savingConfig.value}
              >
                {savingConfig.value ? "Saving..." : "Save"}
              </button>
            </>
          )}
        >
          <div class="space-y-3">
            <FormField label="Anchor date" error={null} hint="A known pay date">
              <input
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={ppAnchorDate.value}
                onInput={(e) =>
                  ppAnchorDate.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
            <FormField label="Period length (days)" error={null} hint="Typical: 14 for bi-weekly, 7 for weekly">
              <input
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={ppLengthDays.value}
                onInput={(e) =>
                  ppLengthDays.value = (e.target as HTMLInputElement).value}
                min="1"
              />
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function BudgetLineRow(
  { budget, categoryName }: {
    budget: FinancialBudgetDto;
    categoryName: string;
  },
) {
  const pct = budget.budgetedAmount > 0
    ? Math.min(100, (budget.spentAmount / budget.budgetedAmount) * 100)
    : 0;
  const overBudget = budget.spentAmount > budget.budgetedAmount;

  return (
    <div class="px-4 py-3">
      <div class="flex items-start justify-between gap-4 mb-2">
        <div>
          <div class="font-medium text-gray-900">{categoryName}</div>
          <div class="text-sm text-gray-500">
            Budgeted {formatMoney(budget.budgetedAmount)} • Spent{" "}
            {formatMoney(budget.spentAmount)}
          </div>
        </div>
        <div
          class={overBudget
            ? "font-semibold text-red-600"
            : "font-semibold text-gray-900"}
        >
          {formatMoney(budget.availableAmount)}
        </div>
      </div>
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class={overBudget ? "h-full bg-red-500" : "h-full bg-blue-500"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div class="bg-white border rounded-lg px-4 py-3">
      <div class="text-sm text-gray-500">{label}</div>
      <div class="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

// Date helpers
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function getMonthStart(d: Date): string {
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

function getMonthEnd(d: Date): string {
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

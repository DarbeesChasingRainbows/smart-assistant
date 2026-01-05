import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreateFinancialAccountRequest,
  type FinancialAccountDto,
} from "../../lib/api.ts";
import {
  accountTypes,
  createFinancialAccountSchema,
} from "../../lib/financeSchemas.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function AccountsIsland() {
  const accounts = useSignal<FinancialAccountDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const showCreate = useSignal(false);
  const saving = useSignal(false);

  const name = useSignal("");
  const type = useSignal<(typeof accountTypes)[number]>("Checking");
  const institution = useSignal("");
  const accountNumber = useSignal("");
  const currency = useSignal("USD");
  const openingBalance = useSignal("0");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  const totalBalance = useComputed(() =>
    accounts.value.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0)
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      accounts.value = await api.finance.accounts.list();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load accounts";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    name.value = "";
    type.value = "Checking";
    institution.value = "";
    accountNumber.value = "";
    currency.value = "USD";
    openingBalance.value = "0";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createFinancialAccountSchema.safeParse({
      name: name.value,
      type: type.value,
      institution: institution.value || undefined,
      accountNumber: accountNumber.value || undefined,
      currency: currency.value,
      openingBalance: openingBalance.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    const req: CreateFinancialAccountRequest = {
      ...parsed.data,
      openingBalance: parsed.data.openingBalance ?? 0,
    };

    try {
      const created = await api.finance.accounts.create(req);
      accounts.value = [created, ...accounts.value].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      showCreate.value = false;
      resetForm();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to create account";
    } finally {
      saving.value = false;
    }
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div class="bg-white border rounded-lg px-4 py-3">
          <div class="text-sm text-gray-500">Total balance</div>
          <div class="text-2xl font-semibold text-gray-900">
            {formatMoney(totalBalance.value)}
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              showCreate.value = true;
              resetForm();
            }}
          >
            + Add Account
          </button>
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

      {!loading.value && accounts.value.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          <p class="text-xl">No accounts yet</p>
          <p class="mt-2">
            Create your first account to start tracking finances
          </p>
        </div>
      )}

      {!loading.value && accounts.value.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.value.map((a) => (
            <div key={a.key} class="bg-white border rounded-xl p-4 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold text-gray-900">
                    {a.name}
                  </div>
                  <div class="text-sm text-gray-500">
                    {a.type}
                    {a.institution ? ` • ${a.institution}` : ""}
                  </div>
                </div>
                <span
                  class={a.isActive
                    ? "text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                    : "text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"}
                >
                  {a.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div class="mt-4">
                <div class="text-sm text-gray-500">Current balance</div>
                <div
                  class={a.currentBalance < 0
                    ? "text-2xl font-semibold text-red-600"
                    : "text-2xl font-semibold text-gray-900"}
                >
                  {formatMoney(a.currentBalance)}
                </div>
              </div>

              <div class="mt-4 text-xs text-gray-400">
                {a.currency}
                {a.accountNumber ? ` • •••• ${a.accountNumber}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate.value && (
        <FormModal
          title="New account"
          subtitle="Add a bank, card, or cash account"
          onClose={() => {
            if (saving.value) return;
            showCreate.value = false;
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showCreate.value = false;
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitCreate}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Create"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={formErrors.value} />

          <FormField
            label="Name"
            error={firstError(fieldErrors.value, "name")}
          >
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={name.value}
              onInput={(e) =>
                name.value = (e.target as HTMLInputElement).value}
              placeholder="e.g. Checking"
            />
          </FormField>

          <FormField
            label="Type"
            error={firstError(fieldErrors.value, "type")}
          >
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={type.value}
              onChange={(e) =>
                type.value = (e.target as HTMLSelectElement)
                  .value as typeof accountTypes[number]}
            >
              {accountTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Institution" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={institution.value}
                onInput={(e) =>
                  institution.value = (e.target as HTMLInputElement).value}
                placeholder="e.g. Chase"
              />
            </FormField>
            <FormField label="Last 4" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={accountNumber.value}
                onInput={(e) =>
                  accountNumber.value =
                    (e.target as HTMLInputElement).value}
                placeholder="1234"
                maxLength={4}
              />
            </FormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Currency" error={null} hint="Optional">
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={currency.value}
                onInput={(e) =>
                  currency.value = (e.target as HTMLInputElement).value}
                placeholder="USD"
              />
            </FormField>

            <FormField
              label="Opening balance"
              error={firstError(fieldErrors.value, "openingBalance")}
            >
              <input
                type="number"
                inputMode="decimal"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={openingBalance.value}
                onInput={(e) =>
                  openingBalance.value =
                    (e.target as HTMLInputElement).value}
                step="0.01"
              />
            </FormField>
          </div>
        </FormModal>
      )}
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

import { useSignal } from "@preact/signals";

interface Props {
  familyId: string;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
];

export default function AddAccountModalIsland({ familyId }: Props) {
  const open = useSignal(false);
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);

  const name = useSignal("");
  const accountType = useSignal(ACCOUNT_TYPES[0]?.value ?? "checking");
  const openingBalance = useSignal("0");

  function reset() {
    name.value = "";
    accountType.value = ACCOUNT_TYPES[0]?.value ?? "checking";
    openingBalance.value = "0";
    formError.value = null;
  }

  async function submit() {
    formError.value = null;

    const trimmedName = name.value.trim();
    if (!trimmedName) {
      formError.value = "Account name is required";
      return;
    }

    const parsedBalance = Number.parseFloat(openingBalance.value);
    if (Number.isNaN(parsedBalance)) {
      formError.value = "Opening balance must be a number";
      return;
    }

    submitting.value = true;
    try {
      const res = await fetch("/api/v1/budget/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          familyId,
          name: trimmedName,
          accountType: accountType.value,
          openingBalance: parsedBalance,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        formError.value = text || `Failed to create account (${res.status})`;
        return;
      }

      open.value = false;
      reset();
      globalThis.location?.reload();
    } catch (e) {
      formError.value = e instanceof Error ? e.message : "Failed to create account";
    } finally {
      submitting.value = false;
    }
  }

  return (
    <>
      <button
        type="button"
        class="btn btn-primary"
        onClick={() => {
          reset();
          open.value = true;
        }}
      >
        + Add account
      </button>

      {open.value && (
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            class="absolute inset-0 bg-black/40"
            onClick={() => {
              if (submitting.value) return;
              open.value = false;
            }}
            aria-label="Close"
          />

          <div class="relative w-full max-w-lg rounded-2xl bg-base-100 shadow-xl border border-base-300">
            <div class="px-5 py-4 border-b border-base-300 flex items-start justify-between gap-3">
              <div>
                <div class="text-lg font-semibold">Add account</div>
                <div class="text-sm opacity-70">Create a new budget account</div>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onClick={() => {
                  if (submitting.value) return;
                  open.value = false;
                }}
              >
                ✕
              </button>
            </div>

            <div class="px-5 py-4 space-y-4">
              {formError.value && (
                <div class="alert alert-error">
                  <span>{formError.value}</span>
                </div>
              )}

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Account name</span>
                </label>
                <input
                  class="input input-bordered w-full"
                  value={name.value}
                  onInput={(e) => name.value = (e.target as HTMLInputElement).value}
                  placeholder="e.g., Checking"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Type</span>
                  </label>
                  <select
                    class="select select-bordered w-full"
                    value={accountType.value}
                    onChange={(e) =>
                      accountType.value = (e.target as HTMLSelectElement).value}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Opening balance</span>
                  </label>
                  <input
                    class="input input-bordered w-full"
                    value={openingBalance.value}
                    onInput={(e) =>
                      openingBalance.value = (e.target as HTMLInputElement).value}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-base-300 flex justify-end gap-2">
              <button
                type="button"
                class="btn"
                onClick={() => {
                  if (submitting.value) return;
                  open.value = false;
                }}
                disabled={submitting.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={submit}
                disabled={submitting.value}
              >
                {submitting.value ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

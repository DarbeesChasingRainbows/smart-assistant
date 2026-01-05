import type { ComponentChildren } from "preact";

type FinanceTab =
  | "accounts"
  | "transactions"
  | "budgets"
  | "categories"
  | "merchants"
  | "receipts";

export function FinanceShell(
  { activeTab, children }: {
    activeTab: FinanceTab;
    children: ComponentChildren;
  },
) {
  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">💰</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Finance</h1>
                <p class="text-sm text-gray-500">
                  Track accounts, transactions, budgets, receipts, and
                  reconciliation
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex gap-4">
            <FinanceTabLink href="/finance" active={activeTab === "accounts"}>
              Accounts
            </FinanceTabLink>
            <FinanceTabLink
              href="/finance/transactions"
              active={activeTab === "transactions"}
            >
              Transactions
            </FinanceTabLink>
            <FinanceTabLink
              href="/finance/budgets"
              active={activeTab === "budgets"}
            >
              Budgets
            </FinanceTabLink>
            <FinanceTabLink
              href="/finance/categories"
              active={activeTab === "categories"}
            >
              Categories
            </FinanceTabLink>
            <FinanceTabLink
              href="/finance/merchants"
              active={activeTab === "merchants"}
            >
              Merchants
            </FinanceTabLink>
            <FinanceTabLink
              href="/finance/receipts"
              active={activeTab === "receipts"}
            >
              Receipts
            </FinanceTabLink>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function FinanceTabLink(
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

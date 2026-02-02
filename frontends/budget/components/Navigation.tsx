import type { ComponentChildren } from "preact";
import { IS_BROWSER } from "fresh/runtime";
import { isOnline } from "../lib/api.ts";
import ToastContainer from "../islands/Toast.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";

interface NavigationProps {
  children: ComponentChildren;
  currentPath?: string;
  pageTitle?: string;
}

// Breadcrumb configuration
const BREADCRUMB_MAP: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/accounts": { label: "Accounts", parent: "/dashboard" },
  "/transactions": { label: "Transactions", parent: "/dashboard" },
  "/bills": { label: "Bills", parent: "/dashboard" },
  "/goals": { label: "Goals", parent: "/dashboard" },
  "/reports": { label: "Reports", parent: "/dashboard" },
  "/settings": { label: "Settings", parent: "/dashboard" },
  "/receipts": { label: "Receipts", parent: "/dashboard" },
};

// Build breadcrumb trail
function getBreadcrumbs(path: string): Array<{ label: string; href: string }> {
  const crumbs: Array<{ label: string; href: string }> = [];
  const normalizedPath = path.replace("/budget", "");
  
  let currentKey = normalizedPath;
  while (currentKey && BREADCRUMB_MAP[currentKey]) {
    const config = BREADCRUMB_MAP[currentKey];
    crumbs.unshift({ label: config.label, href: `/budget${currentKey}` });
    currentKey = config.parent || "";
  }
  
  return crumbs;
}

export function Navigation({ children, currentPath = "", pageTitle }: NavigationProps) {
  const isActive = (path: string) => currentPath.includes(path);
  const breadcrumbs = getBreadcrumbs(currentPath);

  // Only show offline banner in browser when actually offline
  const showOfflineBanner = IS_BROWSER && !isOnline.value;

  return (
    <div class="drawer">
      <input id="mobile-nav-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content flex flex-col">
        {/* Offline Banner - Shows when user is offline (client-side only) */}
        {showOfflineBanner && (
          <div class="bg-[#ffb000]/20 border-b-2 border-[#ffb000]">
            <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3">
              <span class="text-xl">📡</span>
              <p class="font-mono text-sm text-[#ffb000]">
                <strong>[OFFLINE MODE]</strong>{" "}
                - Some features may be unavailable
              </p>
            </div>
          </div>
        )}

        {/* Header - Always visible */}
        <header class="bg-theme-tertiary text-theme-primary shadow-lg border-b border-theme">
          {/* Top Row: Logo, Breadcrumbs, User Menu */}
          <div class="max-w-7xl mx-auto px-4 py-3">
            <div class="flex justify-between items-center">
              {/* Logo and Mobile Menu Button */}
              <div class="flex items-center gap-4">
                <label
                  htmlFor="mobile-nav-drawer"
                  class="btn btn-ghost min-h-[44px] min-w-[44px] p-2 md:hidden drawer-button"
                  aria-label="Open navigation menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </label>
                <a
                  href="/budget/dashboard"
                  class="text-xl md:text-2xl font-bold font-mono hover:text-accent-cyan transition-colors min-h-[44px] flex items-center"
                >
                  <span class="text-accent-cyan">$</span>
                  <span class="ml-1">BUDGET</span>
                </a>
                {/* Breadcrumbs - Desktop only */}
                {breadcrumbs.length > 1 && (
                  <nav class="hidden md:flex items-center text-sm font-mono" aria-label="Breadcrumb">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={crumb.href} class="flex items-center">
                        {index > 0 && <span class="mx-2 text-theme-muted">/</span>}
                        {index === breadcrumbs.length - 1 ? (
                          <span class="text-accent-cyan">{crumb.label}</span>
                        ) : (
                          <a href={crumb.href} class="text-theme-secondary hover:text-accent-cyan transition-colors">
                            {crumb.label}
                          </a>
                        )}
                      </span>
                    ))}
                  </nav>
                )}
              </div>

              {/* User Menu (Desktop) */}
              <div class="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <a
                  href="/budget/"
                  class="btn btn-ghost btn-sm min-h-[44px] px-4 font-mono border border-transparent hover:border-accent-green/50 text-theme-secondary hover:text-accent-green"
                >
                  <span class="mr-2">⇄</span>Switch Family
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Row - Desktop only */}
          <nav class="hidden md:block border-t border-theme/50 bg-theme-secondary/30">
            <div class="max-w-7xl mx-auto px-4 py-2">
              <div class="flex items-center gap-1">
                <a
                  href="/budget/dashboard"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/dashboard")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">▶</span>Dashboard
                </a>
                <a
                  href="/budget/accounts"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/accounts")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">$</span>Accounts
                </a>
                <a
                  href="/budget/transactions"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/transactions")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">⚡</span>Transactions
                </a>
                <a
                  href="/budget/bills"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/bills")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">📅</span>Bills
                </a>
                <a
                  href="/budget/goals"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/goals")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">🎯</span>Goals
                </a>
                <a
                  href="/budget/reports"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/reports")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">📊</span>Reports
                </a>
                <a
                  href="/budget/settings"
                  class={`btn btn-ghost btn-sm min-h-[40px] px-4 font-mono border ${
                    isActive("/settings")
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent hover:border-accent-cyan/50"
                  }`}
                >
                  <span class="mr-2">⚙</span>Settings
                </a>
              </div>
            </div>
          </nav>
        </header>

        {/* Page Content */}
        <main class="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer class="bg-theme-primary text-theme-secondary border-t border-theme p-4 mt-12">
          <div class="max-w-7xl mx-auto text-center text-sm font-mono">
            <span class="text-accent-cyan">[</span>
            LifeOS Budget
            <span class="text-accent-cyan">]</span>
          </div>
        </footer>
      </div>

      {/* Mobile Drawer Sidebar */}
      <div class="drawer-side z-50">
        <label
          htmlFor="mobile-nav-drawer"
          aria-label="Close navigation menu"
          class="drawer-overlay"
        >
        </label>
        <nav class="menu p-4 w-80 min-h-full bg-theme-secondary text-theme-primary border-r border-theme">
          {/* Drawer Header */}
          <div class="mb-8 pb-4 border-b border-theme">
            <div class="flex justify-between items-center">
              <h2 class="text-2xl font-bold font-mono">
                <span class="text-accent-cyan">$</span> BUDGET
              </h2>
              <label
                htmlFor="mobile-nav-drawer"
                class="btn btn-ghost btn-sm min-h-[44px] min-w-[44px] btn-circle"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </label>
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <ul class="space-y-2">
            <li>
              <a
                href="/budget/dashboard"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/dashboard")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">▶</span>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/accounts"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/accounts")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">$</span>
                <span>Accounts</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/transactions"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/transactions")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">⚡</span>
                <span>Transactions</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/bills"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/bills")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">📅</span>
                <span>Bills</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/goals"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/goals")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">🎯</span>
                <span>Goals</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/reports"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/reports")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">📊</span>
                <span>Reports</span>
              </a>
            </li>
            <li>
              <a
                href="/budget/settings"
                class={`flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border font-mono ${
                  isActive("/settings")
                    ? "bg-[#00d9ff]/10 border-[#00d9ff] text-[#00d9ff]"
                    : "border-transparent hover:bg-[#00d9ff]/5 hover:border-[#00d9ff]/30"
                }`}
              >
                <span class="text-xl">⚙</span>
                <span>Settings</span>
              </a>
            </li>
          </ul>

          {/* Divider */}
          <div class="divider"></div>

          {/* Mobile Bottom Actions */}
          <ul class="space-y-2">
            <li>
              <div class="flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border border-transparent font-mono">
                <ThemeToggle />
                <span class="text-theme-secondary">Theme</span>
              </div>
            </li>
            <li>
              <a
                href="/budget/"
                class="flex items-center gap-3 min-h-[44px] px-4 py-3 rounded border border-transparent hover:bg-accent-green/5 hover:border-accent-green/30 font-mono text-theme-primary"
              >
                <span class="text-xl">⇄</span>
                <span>Switch Family</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {/* Toast Container - Global notification system */}
      <ToastContainer />
    </div>
  );
}

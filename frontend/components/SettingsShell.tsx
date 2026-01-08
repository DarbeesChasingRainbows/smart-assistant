import type { ComponentChildren } from "preact";

type SettingsTab = "overview" | "profile" | "preferences" | "notifications" | "api" | "security";

export function SettingsShell(
  { activeTab, children }: {
    activeTab: SettingsTab;
    children: ComponentChildren;
  },
) {
  return (
    <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <a href="/" class="text-slate-500 hover:text-slate-700">← Home</a>
            <span class="text-2xl">⚙️</span>
            <div>
              <h1 class="text-2xl font-bold text-slate-900">Settings</h1>
              <p class="text-sm text-slate-500">Preferences, notifications, and system info</p>
            </div>
          </div>
        </div>
      </header>

      <nav class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex flex-wrap gap-4">
            <SettingsTabLink href="/settings" active={activeTab === "overview"}>
              Overview
            </SettingsTabLink>
            <SettingsTabLink href="/settings/profile" active={activeTab === "profile"}>
              Profile
            </SettingsTabLink>
            <SettingsTabLink
              href="/settings/preferences"
              active={activeTab === "preferences"}
            >
              Preferences
            </SettingsTabLink>
            <SettingsTabLink
              href="/settings/notifications"
              active={activeTab === "notifications"}
            >
              Notifications
            </SettingsTabLink>
            <SettingsTabLink href="/settings/api" active={activeTab === "api"}>
              API
            </SettingsTabLink>
            <SettingsTabLink href="/settings/security" active={activeTab === "security"}>
              Security
            </SettingsTabLink>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 py-7">
        {children}
      </main>
    </div>
  );
}

function SettingsTabLink(
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
        ? "px-4 py-3 text-blue-700 border-b-2 border-blue-600 font-semibold"
        : "px-4 py-3 text-slate-500 hover:text-slate-700 transition-colors"}
    >
      {children}
    </a>
  );
}

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

type HealthState = "ok" | "error";

interface HealthData {
  status: string;
  timestamp?: string;
}

export default function SettingsOverviewIsland() {
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const state = useSignal<HealthState>("ok");
  const health = useSignal<HealthData | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/health", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        state.value = "error";
        health.value = null;
        error.value = `Health check failed (${res.status})`;
        return;
      }

      const data = await res.json() as HealthData;
      health.value = data;
      state.value = "ok";
    } catch (e) {
      state.value = "error";
      health.value = null;
      error.value = e instanceof Error ? e.message : "Health check failed";
    } finally {
      loading.value = false;
    }
  }

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Profile"
          description="Your name, contact, and identity context"
          href="/settings/profile"
          icon="👤"
        />
        <SectionCard
          title="Preferences"
          description="UI and behavior defaults"
          href="/settings/preferences"
          icon="🎛️"
        />
        <SectionCard
          title="Notifications"
          description="Alerts, reminders, and delivery settings"
          href="/settings/notifications"
          icon="🔔"
        />
        <SectionCard
          title="API"
          description="Integrations and API-related settings"
          href="/settings/api"
          icon="🔌"
        />
        <SectionCard
          title="Security"
          description="Device & access hardening"
          href="/settings/security"
          icon="🛡️"
        />
        <SectionCard
          title="System"
          description="Health and diagnostics"
          href="#system"
          icon="🩺"
        />
      </div>

      <div id="system" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-slate-900">System health</div>
            <div class="text-sm text-slate-500">Quick status check for the backend</div>
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            onClick={load}
            disabled={loading.value}
          >
            {loading.value ? "Checking..." : "Recheck"}
          </button>
        </div>

        {error.value && (
          <div class="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error.value}
          </div>
        )}

        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            class={
              `rounded-2xl border p-4 ${state.value === "ok" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`
            }
          >
            <div class="text-xs text-slate-500">Status</div>
            <div class="mt-1 text-xl font-semibold text-slate-900">
              {state.value === "ok" ? "Operational" : "Degraded"}
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs text-slate-500">Backend status</div>
            <div class="mt-1 text-xl font-semibold text-slate-900">
              {health.value?.status ?? (loading.value ? "…" : "Unknown")}
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="text-xs text-slate-500">Timestamp</div>
            <div class="mt-1 text-sm font-mono text-slate-900 break-all">
              {health.value?.timestamp ?? (loading.value ? "…" : "-")}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div class="text-lg font-semibold text-slate-900">Quick links</div>
        <div class="text-sm text-slate-500 mt-1">Common pages</div>
        <div class="mt-4 flex flex-wrap gap-2">
          <a
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
            href="/people"
          >
            People
          </a>
          <a
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
            href="/garden"
          >
            Garden
          </a>
          <a
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
            href="/inventory"
          >
            Inventory
          </a>
          <a
            class="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
            href="/budget"
          >
            Budget
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionCard(
  { title, description, href, icon }: {
    title: string;
    description: string;
    href: string;
    icon: string;
  },
) {
  return (
    <a
      href={href}
      class="block bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:bg-slate-50 transition-colors"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-lg font-semibold text-slate-900">{title}</div>
          <div class="text-sm text-slate-500 mt-1">{description}</div>
        </div>
        <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">
          {icon}
        </div>
      </div>
    </a>
  );
}

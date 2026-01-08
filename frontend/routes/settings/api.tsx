import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { SettingsShell } from "../../components/SettingsShell.tsx";

export default define.page(function SettingsApi() {
  return (
    <div>
      <Head>
        <title>Settings - API - LifeOS</title>
      </Head>
      <SettingsShell activeTab="api">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="text-lg font-semibold text-slate-900">API</div>
          <div class="text-sm text-slate-500 mt-1">
            API key management coming soon...
          </div>
        </div>
      </SettingsShell>
    </div>
  );
});

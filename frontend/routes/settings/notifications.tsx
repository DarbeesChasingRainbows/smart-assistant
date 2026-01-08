import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { SettingsShell } from "../../components/SettingsShell.tsx";

export default define.page(function SettingsNotifications() {
  return (
    <div>
      <Head>
        <title>Settings - Notifications - LifeOS</title>
      </Head>
      <SettingsShell activeTab="notifications">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="text-lg font-semibold text-slate-900">Notifications</div>
          <div class="text-sm text-slate-500 mt-1">
            Notification settings coming soon...
          </div>
        </div>
      </SettingsShell>
    </div>
  );
});

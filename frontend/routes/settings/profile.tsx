import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { SettingsShell } from "../../components/SettingsShell.tsx";

export default define.page(function SettingsProfile() {
  return (
    <div>
      <Head>
        <title>Settings - Profile - LifeOS</title>
      </Head>
      <SettingsShell activeTab="profile">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div class="text-lg font-semibold text-slate-900">Profile</div>
          <div class="text-sm text-slate-500 mt-1">
            Profile management coming soon...
          </div>
        </div>
      </SettingsShell>
    </div>
  );
});

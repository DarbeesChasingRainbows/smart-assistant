import { Head } from "fresh/runtime";
import { define } from "@/utils.ts";
import { SettingsShell } from "../../components/SettingsShell.tsx";
import SettingsOverviewIsland from "../../islands/settings/SettingsOverviewIsland.tsx";

export default define.page(function Settings() {
  return (
    <div>
      <Head>
        <title>Settings - LifeOS</title>
      </Head>
      <SettingsShell activeTab="overview">
        <SettingsOverviewIsland />
      </SettingsShell>
    </div>
  );
});

import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { CategoryGroup, PayPeriod } from "../types/api.ts";
import SettingsManager from "../islands/SettingsManager.tsx";
import { Navigation } from "../components/Navigation.tsx";

function getApiBase(): string {
  const rawApiUrl = Deno.env.get("VITE_API_URL");
  const apiUrl = rawApiUrl || "http://localhost:5120/api";
  const normalizedBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  return `${normalizedBase}/v1/budget`;
}

interface SettingsData {
  currentPeriod: PayPeriod | null;
  allPeriods: PayPeriod[];
  categories: CategoryGroup[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const apiBase = getApiBase();
      const [periodRes, allPeriodsRes, categoriesRes] = await Promise.all([
        fetch(`${apiBase}/pay-periods/current`),
        fetch(`${apiBase}/pay-periods`),
        fetch(`${apiBase}/category-groups`),
      ]);

      const currentPeriod: PayPeriod | null = periodRes.ok
        ? await periodRes.json()
        : null;
      const allPeriods: PayPeriod[] = allPeriodsRes.ok
        ? await allPeriodsRes.json()
        : [];
      const categories: CategoryGroup[] = categoriesRes.ok
        ? await categoriesRes.json()
        : [];

      return { data: { currentPeriod, allPeriods, categories } };
    } catch (error) {
      console.error("Error fetching settings:", error);
      return {
        data: {
          currentPeriod: null,
          allPeriods: [],
          categories: [],
          error: "Could not connect to backend",
        },
      };
    }
  },
});

export default define.page<typeof handler>(function SettingsPage(props) {
  const { currentPeriod, allPeriods, categories, error } = props
    .data as SettingsData;

  return (
    <>
      <Head>
        <title>Budget - Settings</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/settings">
        <div class="min-h-screen bg-theme-primary">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            <h1 class="text-2xl md:text-3xl font-bold text-theme-primary font-mono mb-6 flex items-center gap-3">
              <span class="text-accent-cyan">⚙</span>
              <span>SETTINGS</span>
            </h1>

            {error && (
              <div class="alert alert-error mb-6 font-mono">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <SettingsManager
              currentPeriod={currentPeriod}
              allPeriods={allPeriods}
              categories={categories}
            />
          </main>
        </div>
      </Navigation>
    </>
  );
});

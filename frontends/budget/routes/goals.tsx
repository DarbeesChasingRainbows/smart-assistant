import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import type { Goal } from "../types/api.ts";
import { Navigation } from "../components/Navigation.tsx";
import GoalsManager from "../islands/GoalsManager.tsx";

function getApiBase(): string {
  return (Deno.env.get("VITE_API_URL") || "http://api:5120/api").replace(
    /\/$/,
    "",
  );
}

interface GoalsData {
  goals: Goal[];
  error?: string;
}

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/goals?includeCompleted=true`);
      const goals: Goal[] = res.ok ? await res.json() : [];
      return { data: { goals } };
    } catch (error) {
      console.error("Error fetching goals:", error);
      return { data: { goals: [], error: "Could not connect to backend" } };
    }
  },
});

export default define.page<typeof handler>(function GoalsPage(props) {
  const { goals, error } = props.data as GoalsData;

  return (
    <>
      <Head>
        <title>Budget - Goals</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <Navigation currentPath="/goals">
        <div class="min-h-screen bg-[#0a0a0a]">
          <main class="max-w-7xl mx-auto p-4 md:p-6">
            <h1 class="text-2xl md:text-3xl font-bold text-white font-mono mb-6 flex items-center gap-2">
              <span class="text-[#00d9ff]">🎯</span>
              <span>GOALS</span>
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

            <GoalsManager initialGoals={goals} />
          </main>
        </div>
      </Navigation>
    </>
  );
});

import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import PeopleListIsland from "../../islands/people/PeopleListIsland.tsx";

export default define.page(function PeoplePage() {
  return (
    <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      <Head>
        <title>People - LifeOS</title>
      </Head>

      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-3xl">👥</span>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">People</h1>
                <p class="text-sm text-gray-500">
                  Manage family, contacts, and relationships
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <a
                href="/people/new"
                class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                + Add Family Member
              </a>
              <a
                href="/"
                class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <PeopleListIsland />
      </main>
    </div>
  );
});

import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import PeopleListIsland from "../../islands/people/PeopleListIsland.tsx";

export default define.page(function PeoplePage() {
  return (
    <div class="min-h-screen bg-gray-100">
      <Head>
        <title>People - LifeOS</title>
      </Head>

      <header class="bg-white shadow-sm">
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
            <a
              href="/"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <PeopleListIsland />
      </main>
    </div>
  );
});

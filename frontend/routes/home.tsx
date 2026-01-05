import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function HomePage() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Head>
        <title>LifeOS - Home</title>
      </Head>

      <div class="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="flex items-center gap-4 mb-8">
          <span class="text-4xl">🏠</span>
          <div>
            <h1 class="text-4xl font-bold text-gray-900">Home</h1>
            <p class="text-gray-600">
              Household operations + family rhythm. Dojo lives here as a sub-area.
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/calendar"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-2">
              <span class="text-3xl">🗓️</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Calendar
              </h2>
            </div>
            <p class="text-gray-600">Family events, recurring routines, reminders.</p>
          </a>

          <div class="bg-white rounded-xl shadow-lg p-6 opacity-80">
            <div class="flex items-center gap-4 mb-2">
              <span class="text-3xl">🧹</span>
              <h2 class="text-2xl font-bold text-gray-800">Chores</h2>
            </div>
            <p class="text-gray-600">
              Create chores, assign to kids, track completions (API ready).
            </p>
            <div class="mt-4 text-gray-500 font-medium">UI coming soon</div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 opacity-80">
            <div class="flex items-center gap-4 mb-2">
              <span class="text-3xl">🥋</span>
              <h2 class="text-2xl font-bold text-gray-800">Dojo</h2>
            </div>
            <p class="text-gray-600">Habits + identity (sub-area inside Home).</p>
            <div class="mt-4 text-gray-500 font-medium">UI coming soon</div>
          </div>

          <a
            href="/people"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-2">
              <span class="text-3xl">👨‍👩‍👧‍👦</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                People
              </h2>
            </div>
            <p class="text-gray-600">Family members and relationships.</p>
          </a>
        </div>

        <div class="mt-10 bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-900 mb-2">API endpoints</h3>
          <p class="text-gray-600 mb-3">
            Home APIs are available under <code>/api/v1/home</code>.
          </p>
          <div class="text-sm text-gray-700">
            <div><code>GET /api/v1/home/members</code></div>
            <div><code>POST /api/v1/home/members</code></div>
            <div><code>GET /api/v1/home/chores</code></div>
            <div><code>POST /api/v1/home/chores</code></div>
            <div><code>GET /api/v1/home/assignments</code></div>
            <div><code>POST /api/v1/home/assignments</code></div>
            <div><code>POST /api/v1/home/completions</code></div>
            <div><code>GET /api/v1/home/calendars</code></div>
            <div><code>POST /api/v1/home/calendars</code></div>
            <div><code>GET /api/v1/home/events/by-calendar/&lt;calendarId&gt;</code></div>
            <div><code>POST /api/v1/home/events</code></div>
          </div>
        </div>
      </div>
    </div>
  );
});

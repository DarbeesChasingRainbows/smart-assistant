import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Home(ctx) {
  console.log("Shared value " + ctx.state.shared);

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>LifeOS - Your Life Operating System</title>
      </Head>

      {/* Hero Section */}
      <div class="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="text-5xl font-bold text-gray-900 mb-4">
            LifeOS
          </h1>
          <p class="text-xl text-gray-600 mb-8">
            Your personal life operating system for RV living, farming, and
            family
          </p>
        </div>

        {/* Domain Cards */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {/* Garage */}
          <a
            href="/garage"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">🚗</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Garage
              </h2>
            </div>
            <p class="text-gray-600">
              Manage vehicles, components, and maintenance schedules
            </p>
            <div class="mt-4 text-blue-600 font-medium">
              View Garage →
            </div>
          </a>

          {/* Garden */}
          <a
            href="/garden"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">🌱</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                Garden
              </h2>
            </div>
            <p class="text-gray-600">
              Track crops, garden beds, and growing schedules
            </p>
            <div class="mt-4 text-green-600 font-medium">
              View Garden →
            </div>
          </a>

          {/* Finance */}
          <a
            href="/finance"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">💰</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Finance
              </h2>
            </div>
            <p class="text-gray-600">
              Accounts, transactions, budgets, receipts, and reconciliation
            </p>
            <div class="mt-4 text-blue-600 font-medium">
              View Finance →
            </div>
          </a>

          {/* Inventory */}
          <a
            href="/inventory"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">📦</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Inventory
              </h2>
            </div>
            <p class="text-gray-600">
              Locations, bins, stock levels, adjustments, and transfers
            </p>
            <div class="mt-4 text-blue-600 font-medium">
              View Inventory →
            </div>
          </a>

          {/* Academy */}
          <div class="bg-white rounded-xl shadow-lg p-6 opacity-60">
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">📚</span>
              <h2 class="text-2xl font-bold text-gray-800">Academy</h2>
            </div>
            <p class="text-gray-600">
              Learn new skills and track educational progress
            </p>
            <div class="mt-4 text-gray-400 font-medium">
              Coming Soon
            </div>
          </div>

          {/* Home */}
          <a
            href="/home"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">🏠</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Home
              </h2>
            </div>
            <p class="text-gray-600">
              Chores, family routines, and household calendar (includes Dojo)
            </p>
            <div class="mt-4 text-blue-600 font-medium">
              View Home →
            </div>
          </a>

          {/* Boardroom */}
          <div class="bg-white rounded-xl shadow-lg p-6 opacity-60">
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">📊</span>
              <h2 class="text-2xl font-bold text-gray-800">Boardroom</h2>
            </div>
            <p class="text-gray-600">
              Strategic planning, KPIs, and vision tracking
            </p>
            <div class="mt-4 text-gray-400 font-medium">
              Coming Soon
            </div>
          </div>

          {/* People */}
          <a
            href="/people"
            class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
          >
            <div class="flex items-center gap-4 mb-4">
              <span class="text-4xl">👥</span>
              <h2 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                People
              </h2>
            </div>
            <p class="text-gray-600">
              Manage family members, contacts, and relationships
            </p>
            <div class="mt-4 text-blue-600 font-medium">
              View People →
            </div>
          </a>
        </div>
      </div>
    </div>
  );
});

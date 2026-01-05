import { PageProps, page } from "fresh";
import { define, url } from "../utils.ts";

export default define.page(function Home(ctx) {
  return (
    <div class="px-4 py-8 mx-auto fresh-gradient min-h-screen">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-12">
          <h1 class="text-5xl font-bold text-gray-800 mb-4">Garage Management</h1>
          <p class="text-xl text-gray-600">Track your vehicles, maintenance, and expenses</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <a href={url("/vehicles")} class="card bg-white shadow-lg hover:shadow-xl transition-shadow p-6">
            <div class="flex items-center mb-4">
              <svg class="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <h2 class="text-2xl font-semibold text-gray-800">Vehicles</h2>
            </div>
            <p class="text-gray-600">Manage your vehicle fleet</p>
            <div class="mt-4 text-blue-500 font-medium">View Vehicles →</div>
          </a>

          <a href={url("/maintenance/history")} class="card bg-white shadow-lg hover:shadow-xl transition-shadow p-6">
            <div class="flex items-center mb-4">
              <svg class="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h2 class="text-2xl font-semibold text-gray-800">Maintenance</h2>
            </div>
            <p class="text-gray-600">Track maintenance history</p>
            <div class="mt-4 text-green-500 font-medium">View History →</div>
          </a>

          <a href={url("/vin-lookup")} class="card bg-white shadow-lg hover:shadow-xl transition-shadow p-6">
            <div class="flex items-center mb-4">
              <svg class="w-8 h-8 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 class="text-2xl font-semibold text-gray-800">VIN Lookup</h2>
            </div>
            <p class="text-gray-600">Decode vehicle information</p>
            <div class="mt-4 text-purple-500 font-medium">Lookup VIN →</div>
          </a>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-3xl font-bold text-gray-800 mb-6">Quick Stats</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-blue-500">0</div>
              <div class="text-gray-600 mt-2">Total Vehicles</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-500">0</div>
              <div class="text-gray-600 mt-2">Maintenance Records</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-500">$0</div>
              <div class="text-gray-600 mt-2">Total Spent</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-purple-500">0</div>
              <div class="text-gray-600 mt-2">Upcoming Service</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

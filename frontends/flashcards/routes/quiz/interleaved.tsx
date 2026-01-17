import { define, url } from "../../utils.ts";
import { RetentionApiClient } from "../../utils/api.ts";
import InterleavedQuiz from "../../islands/InterleavedQuiz.tsx";

const client = new RetentionApiClient();

export default define.page(async (_ctx) => {
  const decks = await client.getDecks();

  return (
    <div class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <a href={url("/")} class="text-2xl font-bold text-indigo-600">
                AnkiQuiz
              </a>
            </div>
            <div class="flex items-center space-x-4">
              <a
                href={url("/decks")}
                class="text-gray-600 hover:text-indigo-600"
              >
                Decks
              </a>
              <a
                href={url("/quiz/interleaved")}
                class="text-indigo-600 font-medium"
              >
                Interleaved Study
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <InterleavedQuiz availableDecks={decks} />
    </div>
  );
});

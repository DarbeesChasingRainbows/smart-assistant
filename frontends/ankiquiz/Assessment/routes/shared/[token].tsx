import { define } from "../../utils.ts";
import { RetentionApiClient } from "../../utils/api.ts";
import CloneDeckButton from "../../islands/CloneDeckButton.tsx";

const client = new RetentionApiClient();

export default define.page(async (ctx) => {
  const token = ctx.params.token;
  
  let deck = null;
  let error = null;
  
  try {
    deck = await client.getSharedDeck(token);
  } catch (e) {
    error = e instanceof Error ? e.message : "Deck not found";
  }

  if (!deck || error) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center max-w-md p-8">
          <div class="text-6xl mb-4">🔗</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Shared Deck Not Found</h1>
          <p class="text-gray-600 mb-6">
            This shared link may have expired or been revoked by the owner.
          </p>
          <a href="/decks" class="btn btn-primary">Browse Public Decks</a>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Header */}
      <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <a href="/" class="text-2xl font-bold text-indigo-600">AnkiQuiz</a>
            </div>
            <div class="flex items-center space-x-4">
              <span class="badge badge-info">Shared Deck</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Shared Deck Content */}
      <div class="max-w-4xl mx-auto p-8">
        <div class="card bg-white shadow-xl">
          <div class="card-body">
            {/* Deck Header */}
            <div class="text-center mb-8">
              <div class="badge badge-outline mb-4">{deck.category}</div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{deck.name}</h1>
              <p class="text-gray-600">{deck.description}</p>
              <div class="flex justify-center gap-4 mt-4 text-sm text-gray-500">
                <span>{deck.cardCount} cards</span>
                <span>•</span>
                <span>{deck.difficultyLevel}</span>
              </div>
            </div>

            {/* Actions */}
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href={`/quiz/${deck.id}`} 
                class="btn btn-primary btn-lg"
              >
                Start Quiz
              </a>
              <CloneDeckButton shareToken={token} deckName={deck.name} />
            </div>

            {/* Info Box */}
            <div class="alert alert-info mt-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 class="font-bold">Shared Deck</h3>
                <div class="text-sm">
                  This deck was shared with you. You can study it directly or create your own copy.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

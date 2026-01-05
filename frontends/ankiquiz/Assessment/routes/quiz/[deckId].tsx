import { define } from "../../utils.ts";
import { RetentionApiClient } from "../../utils/api.ts";
import FlashcardQuiz from "../../islands/FlashcardQuiz.tsx";

const client = new RetentionApiClient();

export default define.page(async (ctx) => {
  const deckId = ctx.params.deckId;
  const deck = await client.getDeck(deckId);
  
  if (!deck) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">Deck not found</h1>
          <a href="/decks" class="btn btn-link mt-4">Back to Decks</a>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div class="max-w-4xl mx-auto">
        {/* Header */}
        <div class="text-center mb-8 pt-8">
          <div class="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
            <a href="/decks" class="hover:underline">Decks</a>
            <span>/</span>
            <span>{deck.category}</span>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">{deck.name}</h1>
          <p class="text-lg text-gray-600">{deck.description}</p>
          <div class="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <span>{deck.cardCount} cards</span>
            <span>•</span>
            <span>{deck.difficultyLevel}</span>
          </div>
        </div>

        {/* Flashcard Quiz Component */}
        <FlashcardQuiz deckId={deckId} />

        {/* Footer */}
        <div class="text-center mt-8 pb-8">
          <a href="/decks" class="btn btn-secondary">Back to Decks</a>
        </div>
      </div>
    </div>
  );
});

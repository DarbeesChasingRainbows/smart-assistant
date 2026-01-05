import { define } from "../../utils.ts";
import { RetentionApiClient } from "../../utils/api.ts";
import CrossReferencePanel from "../../islands/CrossReferencePanel.tsx";
import DeckFlashcardList from "../../islands/DeckFlashcardList.tsx";

const client = new RetentionApiClient();

export default define.page(async (ctx) => {
  const id = ctx.params.id;
  const deck = await client.getDeck(id);
  const flashcards = await client.getFlashcardsForDeck(id);
  const outgoingRefs = await client.getCrossReferences(id);
  const incomingRefs = await client.getBacklinks(id);
  
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
    <div class="min-h-screen bg-gray-50 p-8">
        <div class="max-w-6xl mx-auto">
            {/* Header */}
            <div class="mb-8 space-y-4">
                <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <a href="/decks" class="hover:underline">Decks</a>
                    <span>/</span>
                    <span>{deck.category}</span>
                </div>
                <h1 class="text-4xl font-bold text-gray-900 mb-2">{deck.name}</h1>
                <p class="text-xl text-gray-600">{deck.description}</p>
                <div class="flex flex-wrap gap-3">
                    <a href={`/quiz/${id}`} class="btn btn-primary">Start Quiz</a>
                    <a href="/decks" class="btn btn-ghost">Back to Decks</a>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div class="lg:col-span-2 space-y-8">
                    <div class="card bg-white shadow p-6">
                        <h2 class="text-2xl font-bold mb-4">Stats</h2>
                        <div class="stats shadow w-full">
                            <div class="stat">
                                <div class="stat-title">Total Cards</div>
                                <div class="stat-value">{deck.cardCount}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-title">Difficulty</div>
                                <div class="stat-value text-primary text-lg">{deck.difficultyLevel}</div>
                            </div>
                        </div>
                        <div class="mt-8">
                            <DeckFlashcardList 
                                deckId={id} 
                                initialFlashcards={flashcards.map(f => ({
                                    id: f.id,
                                    question: f.question,
                                    answer: f.answer,
                                    deckId: f.deckId,
                                    createdAt: f.createdAt
                                }))} 
                            />
                        </div>
                        <div class="mt-6 flex justify-end">
                            <a href={`/quiz/${id}`} class="btn btn-primary">Start Quiz</a>
                        </div>
                    </div>

                    {/* Incoming Links (Backlinks) - The "Obsidian" Feature */}
                    {incomingRefs.length > 0 && (
                        <div class="card bg-white shadow p-6">
                            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                                <span class="text-xl">🔗</span> Linked From (Backlinks)
                            </h3>
                            <CrossReferencePanel references={incomingRefs} />
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div class="space-y-6">
                    {/* Outgoing Links */}
                    <div class="card bg-white shadow p-6">
                        <h3 class="text-lg font-bold mb-4">Related Content</h3>
                        <CrossReferencePanel references={outgoingRefs} />
                    </div>
                </div>
                <div class="mt-8 flex justify-between items-center">
                    <a href="/decks" class="btn btn-ghost">Back to Decks</a>
                    <a href={`/quiz/${id}`} class="btn btn-primary">Start Quiz</a>
                </div>
            </div>
        </div>
    </div>
  );
});

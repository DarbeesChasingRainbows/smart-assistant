/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import { marked } from "marked";
import type { Deck, Flashcard } from "../utils/api.ts";
import type { InterleavedQuizResponse } from "../utils/api.ts";
import ErrorAlert from "../components/ErrorAlert.tsx";
import LoadingSpinner from "../components/LoadingSpinner.tsx";

interface InterleavedQuizProps {
  availableDecks: Deck[];
}

type ReviewRating = "Again" | "Hard" | "Good" | "Easy";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const flipAnimationMs = 700;

/**
 * Interleaved Quiz component that allows studying cards from multiple decks.
 * Cards are shuffled across decks to improve learning through interleaving.
 */
export default function InterleavedQuiz({ availableDecks }: InterleavedQuizProps) {
  // Selection state
  const selectedDeckIds = useSignal<Set<string>>(new Set());
  const cardsPerDeck = useSignal(5);
  const difficulty = useSignal("Medium");
  
  // Quiz state
  const session = useSignal<InterleavedQuizResponse | null>(null);
  const currentCard = useSignal<Flashcard | null>(null);
  const currentIndex = useSignal(0);
  const isFlipped = useSignal(false);
  
  // UI state
  const loading = useSignal(false);
  const loadingElapsed = useSignal(0);
  const error = useSignal("");
  const quizStarted = useSignal(false);

  const toggleDeck = (deckId: string) => {
    const newSet = new Set(selectedDeckIds.value);
    if (newSet.has(deckId)) {
      newSet.delete(deckId);
    } else {
      newSet.add(deckId);
    }
    selectedDeckIds.value = newSet;
  };

  const selectAll = () => {
    selectedDeckIds.value = new Set(availableDecks.map(d => d.id));
  };

  const clearAll = () => {
    selectedDeckIds.value = new Set();
  };

  const startQuiz = async () => {
    if (selectedDeckIds.value.size === 0) {
      error.value = "Please select at least one deck";
      return;
    }

    loading.value = true;
    loadingElapsed.value = 0;
    error.value = "";

    // Start elapsed timer
    const timer = setInterval(() => {
      loadingElapsed.value += 1;
    }, 1000);

    try {
      const response = await fetch("/api/quiz/interleaved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deckIds: Array.from(selectedDeckIds.value),
          cardsPerDeck: cardsPerDeck.value,
          difficulty: difficulty.value,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create quiz: ${response.statusText}`);
      }

      const quizSession: InterleavedQuizResponse = await response.json();
      session.value = quizSession;

      if (quizSession.cards.length > 0) {
        await loadCard(quizSession.cards[0].cardId);
        quizStarted.value = true;
      } else {
        error.value = "No cards available for the selected decks";
      }
    } catch (e) {
      console.error(e);
      error.value = e instanceof Error ? e.message : "Failed to start quiz";
    } finally {
      clearInterval(timer);
      loading.value = false;
    }
  };

  const loadCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards/${cardId}`);
      if (!response.ok) throw new Error("Failed to fetch card");
      const card: Flashcard = await response.json();
      currentCard.value = card;
      isFlipped.value = false;
    } catch (e) {
      console.error(e);
      error.value = "Error loading card";
    }
  };

  const flipCard = () => {
    isFlipped.value = !isFlipped.value;
  };

  const processContent = (content: string) => {
    let html = marked.parse(content) as string;
    html = html.replace(/Spell the word:\s*[^\<]+(?=\<|$)/, 'Spell the word:');
    return html.replace(/src=(["'])\/uploads\//g, 'src=$1http://localhost:5137/uploads/');
  };

  const submitRating = async (rating: ReviewRating) => {
    if (!currentCard.value || !session.value) return;

    try {
      // Update card scheduling
      await fetch(`/api/v1/flashcards/${currentCard.value.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      // Move to next card
      const nextIndex = currentIndex.value + 1;
      if (nextIndex < session.value.cards.length) {
        isFlipped.value = false;
        await wait(flipAnimationMs);
        currentIndex.value = nextIndex;
        await loadCard(session.value.cards[nextIndex].cardId);
      } else {
        // Quiz completed
        isFlipped.value = false;
        await wait(flipAnimationMs);
        session.value = null;
        currentCard.value = null;
        quizStarted.value = false;
      }
    } catch (e) {
      console.error("Failed to submit rating:", e);
      error.value = "Error submitting rating. Please try again.";
    }
  };

  const getCurrentDeckInfo = () => {
    if (!session.value || currentIndex.value >= session.value.cards.length) return null;
    const card = session.value.cards[currentIndex.value];
    return {
      name: card.deckName,
      category: card.deckCategory,
    };
  };

  // Deck selection UI
  if (!quizStarted.value) {
    return (
      <div class="max-w-4xl mx-auto p-6 space-y-6">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Interleaved Study</h1>
          <p class="text-gray-600">
            Select multiple decks to study together. Cards will be shuffled across subjects
            to improve long-term retention through interleaving.
          </p>
        </div>

        {error.value && (
          <ErrorAlert message={error.value} onRetry={() => error.value = ""} />
        )}

        {loading.value ? (
          <LoadingSpinner 
            message="Creating interleaved quiz..." 
            showTimeoutWarning 
            elapsedSeconds={loadingElapsed.value} 
          />
        ) : (
          <>
            {/* Deck Selection */}
            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="card-title">Select Decks</h2>
                  <div class="space-x-2">
                    <button type="button" class="btn btn-sm btn-ghost" onClick={selectAll}>
                      Select All
                    </button>
                    <button type="button" class="btn btn-sm btn-ghost" onClick={clearAll}>
                      Clear
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableDecks.map((deck) => (
                    <label
                      key={deck.id}
                      class={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        selectedDeckIds.value.has(deck.id)
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        class="checkbox checkbox-primary mr-3"
                        checked={selectedDeckIds.value.has(deck.id)}
                        onChange={() => toggleDeck(deck.id)}
                      />
                      <span class="font-medium">{deck.name}</span>
                      <div class="text-sm text-gray-500 mt-1">
                        {deck.category} • {deck.cardCount} cards
                      </div>
                    </label>
                  ))}
                </div>

                {availableDecks.length === 0 && (
                  <div class="text-center text-gray-500 py-8">
                    No decks available. Create some decks first!
                  </div>
                )}
              </div>
            </div>

            {/* Quiz Options */}
            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <h2 class="card-title mb-4">Quiz Options</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Cards per deck</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={cardsPerDeck.value}
                      onInput={(e) => cardsPerDeck.value = parseInt((e.target as HTMLInputElement).value) || 5}
                      class="input input-bordered"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Difficulty</span>
                    </label>
                    <select
                      class="select select-bordered"
                      value={difficulty.value}
                      onChange={(e) => difficulty.value = (e.target as HTMLSelectElement).value}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div class="text-center">
              <button
                type="button"
                class="btn btn-primary btn-lg"
                onClick={startQuiz}
                disabled={selectedDeckIds.value.size === 0}
              >
                Start Interleaved Quiz ({selectedDeckIds.value.size} decks selected)
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Quiz in progress
  const deckInfo = getCurrentDeckInfo();

  if (!currentCard.value || !session.value) {
    return (
      <div class="text-center p-8">
        <div class="alert alert-success mb-6">
          <span>Quiz completed! 🎉</span>
        </div>
        <button type="button" class="btn btn-primary" onClick={() => quizStarted.value = false}>
          Start New Quiz
        </button>
      </div>
    );
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div class="w-full max-w-2xl space-y-6">
        {/* Header with deck context */}
        <div class="text-center space-y-2">
          <h1 class="text-2xl font-bold text-foreground">Interleaved Quiz</h1>
          {deckInfo && (
            <div class="flex justify-center gap-2">
              <span class="badge badge-primary badge-lg">{deckInfo.name}</span>
              <span class="badge badge-outline">{deckInfo.category}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div class="w-full max-w-md mx-auto">
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentIndex.value + 1} / {session.value.cards.length}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-primary h-2 rounded-full transition-all"
              style={`width: ${((currentIndex.value + 1) / session.value.cards.length) * 100}%`}
            ></div>
          </div>
          
          {/* Per-deck progress indicators */}
          <div class="flex flex-wrap gap-2 mt-3 justify-center">
            {Object.entries(session.value.deckInfos).map(([id, info]) => {
              const cardsFromDeck = session.value!.cards.filter(c => c.deckId === id);
              const completedFromDeck = cardsFromDeck.filter((_, i) => 
                session.value!.cards.indexOf(cardsFromDeck[i]) < currentIndex.value
              ).length;
              return (
                <div key={id} class="text-xs text-gray-500">
                  {info.name}: {completedFromDeck}/{info.cardCount}
                </div>
              );
            })}
          </div>
        </div>

        {error.value && (
          <ErrorAlert message={error.value} onRetry={() => error.value = ""} />
        )}

        {/* Flashcard */}
        <div class="perspective-[1000px] h-[350px]">
          <div
            class={`relative w-full h-full cursor-pointer transition-transform duration-700 transform-3d ${
              isFlipped.value ? "rotate-y-180" : ""
            }`}
            onClick={flipCard}
          >
            {/* Front - Question */}
            <div class="absolute inset-0 w-full h-full backface-hidden">
              <div class="card w-full h-full bg-white shadow-2xl border-2 flex items-center justify-center p-6">
                <div class="text-center space-y-4">
                  <div class="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                    Question
                  </div>
                  <div 
                    class="text-xl font-semibold leading-relaxed prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: processContent(currentCard.value.question) }}
                  />
                  <p class="text-sm text-gray-500 mt-6">Click to reveal answer →</p>
                </div>
              </div>
            </div>

            {/* Back - Answer */}
            <div class="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
              <div class="card w-full h-full bg-linear-to-br from-primary/5 to-primary/10 shadow-2xl border-2 border-primary/20 flex items-center justify-center p-6">
                <div class="text-center space-y-4">
                  <div class="inline-block px-3 py-1 bg-primary text-white text-sm font-medium rounded-full">
                    Answer
                  </div>
                  <div 
                    class="text-lg font-medium leading-relaxed prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: processContent(currentCard.value.answer) }}
                  />
                  <p class="text-sm text-gray-500 mt-6">← Click to show question</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons */}
        {isFlipped.value && (
          <div class="space-y-4 animate-fade-in">
            <p class="text-center text-sm font-medium text-gray-600">
              How well did you know this?
            </p>
            <div class="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => submitRating("Again")}
                class="btn btn-outline flex flex-col h-auto py-3 gap-1 border-2 hover:border-error hover:bg-error/10"
              >
                <span class="font-semibold text-error">Again</span>
                <span class="text-xs text-gray-500">&lt;1 day</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Hard")}
                class="btn btn-outline flex flex-col h-auto py-3 gap-1 border-2 hover:border-warning hover:bg-warning/10"
              >
                <span class="font-semibold text-warning">Hard</span>
                <span class="text-xs text-gray-500">1 day</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Good")}
                class="btn btn-outline flex flex-col h-auto py-3 gap-1 border-2 hover:border-info hover:bg-info/10"
              >
                <span class="font-semibold text-info">Good</span>
                <span class="text-xs text-gray-500">3 days</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Easy")}
                class="btn btn-outline flex flex-col h-auto py-3 gap-1 border-2 hover:border-success hover:bg-success/10"
              >
                <span class="font-semibold text-success">Easy</span>
                <span class="text-xs text-gray-500">7 days</span>
              </button>
            </div>
          </div>
        )}

        {/* Exit button */}
        <div class="text-center">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => {
              quizStarted.value = false;
              session.value = null;
              currentCard.value = null;
            }}
          >
            Exit Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

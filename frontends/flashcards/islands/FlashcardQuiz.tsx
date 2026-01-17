import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { marked } from "marked";

interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
}

interface QuizSession {
  id: string;
  cardIds: string[];
  difficulty: string;
}

type ReviewRating = "Again" | "Hard" | "Good" | "Easy";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const flipAnimationMs = 700;

// SM-2 Algorithm calculation
const _calculateSM2 = (
  repetitions: number,
  interval: number,
  easeFactor: number,
  quality: number,
) => {
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = newEaseFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return { newRepetitions, newInterval, newEaseFactor, nextReview };
};

export default function FlashcardQuiz({ deckId }: { deckId: string }) {
  const currentCard = useSignal<Flashcard | null>(null);
  const isFlipped = useSignal(false);
  const currentIndex = useSignal(0);
  const cardIds = useSignal<string[]>([]);
  const loading = useSignal(true);
  const feedback = useSignal("");
  const session = useSignal<QuizSession | null>(null);

  const loadQuiz = async () => {
    loading.value = true;
    try {
      const response = await fetch(
        `/api/quiz?difficulty=Medium&count=10&deckId=${deckId}`,
        {
          method: "POST",
        },
      );
      if (!response.ok) throw new Error("Failed to create quiz session");
      const quizSession: QuizSession = await response.json();
      session.value = quizSession;
      cardIds.value = quizSession.cardIds;

      if (quizSession.cardIds.length > 0) {
        await loadCard(quizSession.cardIds[0]);
      } else {
        feedback.value = "No cards available for this quiz.";
      }
    } catch (e) {
      console.error(e);
      feedback.value = "Error loading quiz. Is the backend running?";
    } finally {
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
      feedback.value = "Error loading card.";
    }
  };

  const flipCard = () => {
    isFlipped.value = !isFlipped.value;
  };

  const processContent = (content: string) => {
    let html = marked.parse(content) as string;
    console.log("[FlashcardQuiz] After marked.parse:", html);

    // Hide the spelling word while preserving audio tags
    // Match everything between "Spell the word:" and the audio tag or end of string
    // This handles words with hyphens, apostrophes, numbers, and multiple words
    html = html.replace(/Spell the word:\s*[^\<]+(?=\<|$)/, "Spell the word:");
    console.log("[FlashcardQuiz] After word hiding regex:", html);

    // Ensure media loads from backend if proxy isn't active
    // Handle both single and double quotes
    const finalHtml = html.replace(
      /src=(["'])\/uploads\//g,
      "src=$1http://localhost:5137/uploads/",
    );
    console.log("[FlashcardQuiz] Final HTML with rewritten src:", finalHtml);
    return finalHtml;
  };

  const submitRating = async (rating: ReviewRating) => {
    if (!currentCard.value || !session.value) return;

    try {
      // Update card scheduling first (critical for spaced repetition)
      const schedulingResponse = await fetch(
        `/api/v1/flashcards/${currentCard.value.id}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        },
      );

      if (!schedulingResponse.ok) {
        throw new Error("Failed to update card scheduling");
      }

      // Record quiz result (analytics only - non-critical)
      try {
        await fetch("/api/quiz-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId: currentCard.value.deckId,
            flashcardId: currentCard.value.id,
            isCorrect: rating !== "Again",
            difficulty: session.value.difficulty,
            rawAnswer: rating,
          }),
        });
      } catch (e) {
        console.warn("Failed to record quiz result (non-critical):", e);
      }

      // Move to next card
      const nextIndex = currentIndex.value + 1;
      if (nextIndex < cardIds.value.length) {
        isFlipped.value = false;
        await wait(flipAnimationMs);
        currentIndex.value = nextIndex;
        await loadCard(cardIds.value[nextIndex]);
      } else {
        isFlipped.value = false;
        await wait(flipAnimationMs);
        feedback.value = "Quiz completed! 🎉";
        currentCard.value = null;
      }
    } catch (e) {
      console.error("Failed to submit rating:", e);
      feedback.value = "Error submitting rating. Please try again.";
    }
  };

  useEffect(() => {
    loadQuiz();
  }, []);

  if (loading.value) {
    return (
      <div class="flex justify-center items-center h-64">
        <div class="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (feedback.value && !currentCard.value) {
    return (
      <div class="text-center">
        <div class="alert alert-success mb-6">
          <span>{feedback.value}</span>
        </div>
        <button type="button" class="btn btn-primary" onClick={loadQuiz}>
          Start New Quiz
        </button>
      </div>
    );
  }

  if (!currentCard.value) {
    return (
      <div class="text-center">
        <div class="alert alert-error">
          <span>{feedback.value}</span>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div class="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold text-foreground">Flashcard Quiz</h1>
          <p class="text-muted-foreground">
            Click the card to reveal the answer, then rate your recall
          </p>
        </div>

        {/* Progress */}
        <div class="w-full max-w-md mx-auto">
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentIndex.value + 1} / {cardIds.value.length}</span>
          </div>
          <div class="progress progress-primary w-full">
            <div
              class="progress-bar"
              style={`width: ${
                ((currentIndex.value + 1) / cardIds.value.length) * 100
              }%`}
            >
            </div>
          </div>
        </div>

        {/* Flashcard with 3D flip animation */}
        <div class="perspective-[1000px] h-[400px]">
          <div
            class={`relative w-full h-full cursor-pointer transition-transform duration-700 transform-3d ${
              isFlipped.value ? "rotate-y-180" : ""
            }`}
            onClick={flipCard}
          >
            {/* Front of card - Question */}
            <div class="absolute inset-0 w-full h-full backface-hidden">
              <div class="card w-full h-full bg-white dark:bg-slate-800 shadow-2xl border-2 border-border flex items-center justify-center p-8">
                <div class="text-center space-y-4">
                  <div class="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
                    Question
                  </div>
                  <div
                    class="text-2xl font-semibold text-foreground leading-relaxed prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: processContent(currentCard.value.question),
                    }}
                  />
                  <p class="text-sm text-muted-foreground mt-8">
                    Click to reveal answer →
                  </p>
                </div>
              </div>
            </div>

            {/* Back of card - Answer */}
            <div class="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
              <div class="card w-full h-full bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 shadow-2xl border-2 border-primary/20 flex items-center justify-center p-8">
                <div class="text-center space-y-4">
                  <div class="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full mb-4">
                    Answer
                  </div>
                  <div
                    class="text-xl font-medium text-foreground leading-relaxed prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: processContent(currentCard.value.answer),
                    }}
                  />
                  <p class="text-sm text-muted-foreground mt-8">
                    ← Click to show question
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div class="flex items-center justify-center gap-3">
          <button
            type="button"
            class="btn btn-outline btn-circle"
            onClick={() => {
              isFlipped.value = !isFlipped.value;
            }}
          >
            ↻
          </button>
        </div>

        {/* Rating buttons - Enhanced with better styling */}
        {isFlipped.value && (
          <div class="space-y-4 animate-fade-in">
            <p class="text-center text-sm font-medium text-muted-foreground">
              How well did you know this?
            </p>
            <div class="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => submitRating("Again")}
                class="btn btn-outline flex flex-col h-auto py-4 gap-2 border-2 hover:border-error hover:bg-error/10"
              >
                <span class="font-semibold text-error">Again</span>
                <span class="text-xs text-muted-foreground">&lt;1 day</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Hard")}
                class="btn btn-outline flex flex-col h-auto py-4 gap-2 border-2 hover:border-warning hover:bg-warning/10"
              >
                <span class="font-semibold text-warning">Hard</span>
                <span class="text-xs text-muted-foreground">1 day</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Good")}
                class="btn btn-outline flex flex-col h-auto py-4 gap-2 border-2 hover:border-info hover:bg-info/10"
              >
                <span class="font-semibold text-info">Good</span>
                <span class="text-xs text-muted-foreground">3 days</span>
              </button>
              <button
                type="button"
                onClick={() => submitRating("Easy")}
                class="btn btn-outline flex flex-col h-auto py-4 gap-2 border-2 hover:border-success hover:bg-success/10"
              >
                <span class="font-semibold text-success">Easy</span>
                <span class="text-xs text-muted-foreground">7 days</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

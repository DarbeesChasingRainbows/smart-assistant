/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Flashcard, QuizSession, GlossaryTerm, CrossReference } from "../utils/api.ts";
import GlossaryPanel from "./GlossaryPanel.tsx";
import CrossReferencePanel from "./CrossReferencePanel.tsx";

export default function QuizInterface() {
  const answer = useSignal("");
  const currentCard = useSignal<Flashcard | null>(null);
  const loading = useSignal(false);
  const feedback = useSignal("");
  const glossaryTerms = useSignal<GlossaryTerm[]>([]);
  const crossReferences = useSignal<CrossReference[]>([]);
  const isAudioCard = useSignal(false);
  const audioPlayed = useSignal(false);
  
  // Client instantiation removed - using internal API proxies

  const speakWord = (text: string) => {
    if ('speechSynthesis' in globalThis) {
      // Cancel any ongoing speech
      globalThis.speechSynthesis.cancel();
      
      // Extract the word to spell from "Spell the word: [word]" format
      const wordMatch = text.match(/Spell the word:\s*(.+)/);
      const wordToSpeak = wordMatch ? wordMatch[1] : text;
      
      const utterance = new SpeechSynthesisUtterance(wordToSpeak);
      utterance.rate = 0.8; // Slightly slower for spelling
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        audioPlayed.value = true;
      };
      
      globalThis.speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
      feedback.value = "Speech synthesis not supported in this browser";
    }
  };

  const isSpellingCard = (question: string): boolean => {
    return question.toLowerCase().includes("spell the word:");
  };

  const loadQuiz = async () => {
    loading.value = true;
    try {
      // Read deckId from URL search params
      const urlParams = new URLSearchParams(globalThis.location.search);
      const deckId = urlParams.get("deckId") || null;
      const scrollTo = urlParams.get("scrollTo");
      
      // Scroll to quiz section if requested
      if (scrollTo === "quiz") {
        setTimeout(() => {
          const quizElement = document.getElementById("quiz");
          if (quizElement) {
            quizElement.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
      
      // 1. Generate a session via internal API
      const qs = new URLSearchParams({ difficulty: "Medium", count: "10" });
      if (deckId) qs.set("deckId", deckId);
      const response = await fetch(`/api/quiz?${qs.toString()}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to create quiz session");
      const session: QuizSession = await response.json();
      
      if (session.cardIds.length > 0) {
        // 2. Fetch the first card via internal API
        const cardResponse = await fetch(`/api/cards/${session.cardIds[0]}`);
        if (!cardResponse.ok) throw new Error("Failed to fetch card");
        const card = await cardResponse.json();
        currentCard.value = card;
        
        // Check if this is an audio spelling card
        isAudioCard.value = isSpellingCard(card.question);
        audioPlayed.value = false;
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

  const loadCardDetails = async (cardId: string, deckId: string) => {
      try {
        // Fetch Glossary
        const gResp = await fetch(`/api/glossary/${cardId}`);
        if (gResp.ok) glossaryTerms.value = await gResp.json();
        else glossaryTerms.value = [];
        
        // Fetch Refs
        const xResp = await fetch(`/api/decks/${deckId}/xrefs`);
        if (xResp.ok) crossReferences.value = await xResp.json();
        else crossReferences.value = [];
      } catch (e) {
          console.error("Error loading card details", e);
      }
  };

  useEffect(() => {
    loadQuiz();
  }, []);

  useEffect(() => {
      if (currentCard.value) {
          loadCardDetails(currentCard.value.id, currentCard.value.deckId);
      } else {
          glossaryTerms.value = [];
          crossReferences.value = [];
      }
  }, [currentCard.value]);

  const onInput = (e: Event) => {
    answer.value = (e.target as HTMLInputElement).value;
  };

  const normalizeSpellingAnswer = (answer: string): string => {
    return answer.toLowerCase().replace(/[-\s]/g, '');
  };

  const onSubmit = async () => {
    if (!currentCard.value) return;
    
    // Normalize answers for spelling comparison
    const normalizedUserAnswer = normalizeSpellingAnswer(answer.value);
    const normalizedCorrectAnswer = normalizeSpellingAnswer(currentCard.value.answer);
    
    let isCorrect = false;
    let feedbackMessage = "";
    
    // Simple check with normalization for spelling cards
    if (isAudioCard.value) {
        if (normalizedUserAnswer === normalizedCorrectAnswer) {
            feedbackMessage = "✅ Correct spelling!";
            isCorrect = true;
        } else {
            feedbackMessage = `❌ Incorrect spelling. The correct spelling was: ${currentCard.value.answer}`;
        }
    } else {
        // Regular comparison for non-spelling cards
        if (answer.value.toLowerCase().trim() === currentCard.value.answer.toLowerCase().trim()) {
            feedbackMessage = "✅ Correct!";
            isCorrect = true;
        } else {
            feedbackMessage = `❌ Incorrect. The answer was: ${currentCard.value.answer}`;
        }
    }

    // Record result to backend (fire-and-forget)
    try {
        await fetch("/api/quiz-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                deckId: currentCard.value.deckId,
                flashcardId: currentCard.value.id,
                isCorrect,
                difficulty: "Medium",
                rawAnswer: answer.value,
            }),
        });
    } catch (e) {
        console.error("Failed to record quiz result:", e);
    }

    feedback.value = feedbackMessage;
    
    // Clear input for next (if we were looping)
    // answer.value = "";
  };

  return (
    <div class="flex flex-col md:flex-row gap-6 w-full max-w-6xl mx-auto p-4">
      <div class="flex-1">
        <div class="card w-full bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Quiz Time!</h2>
            
            {loading.value ? (
                <span class="loading loading-spinner loading-md"></span>
            ) : currentCard.value ? (
                <>
                    {/* Audio Spelling Card UI */}
                    {isAudioCard.value ? (
                        <div class="space-y-4">
                            <div class="alert alert-info">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <div>
                                    <h3 class="font-bold">Audio Spelling Challenge!</h3>
                                    <div class="text-sm">Listen carefully and spell the word you hear.</div>
                                </div>
                            </div>
                            
                            <div class="flex justify-center">
                                <button 
                                    type="button"
                                    class="btn btn-lg btn-circle btn-primary"
                                    onClick={() => speakWord(currentCard.value!.question)}
                                    disabled={!audioPlayed.value}
                                >
                                    {audioPlayed.value ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53L6.75 16.5H4.51a.75.75 0 01-.71-.485A1.5 1.5 0 013 14.5v-5a1.5 1.5 0 01.2-.735.75.75 0 01.71-.485h2.24z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 animate-pulse">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12.25 12.767v1.233a.75.75 0 001.5 0v-1.233a.75.75 0 00-1.5 0zm0-3.517v-.233a.75.75 0 011.5 0v.233a.75.75 0 01-1.5 0zm0 5.75v.233a.75.75 0 001.5 0v-.233a.75.75 0 00-1.5 0zM3.75 12h16.5m-16.5 0a.75.75 0 01.75-.75h16.5a.75.75 0 01.75.75m-16.5 0a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            
                            {!audioPlayed.value && (
                                <div class="text-center text-sm text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 inline animate-spin">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Playing audio...
                                </div>
                            )}
                            
                            {audioPlayed.value && (
                                <div class="text-center text-sm text-gray-500">
                                    Click the speaker button to replay the word
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Regular Text Card */
                        <p class="text-lg">{currentCard.value.question}</p>
                    )}
                    
                    <div class="form-control w-full">
                      <input
                        type="text"
                        placeholder={isAudioCard.value ? "Type the spelling here..." : "Type your answer here..."}
                        class="input input-bordered w-full mt-4"
                        value={answer.value}
                        onInput={onInput}
                      />
                    </div>
                    <div class="card-actions justify-end mt-4">
                      <button type="button" class="btn btn-primary" onClick={onSubmit}>Submit</button>
                    </div>
                </>
            ) : (
                <p>{feedback.value || "Loading..."}</p>
            )}

            {feedback.value && currentCard.value && (
                <div class={`alert mt-4 ${feedback.value.includes("Correct") ? "alert-success" : "alert-error"}`}>
                    <span>{feedback.value}</span>
                </div>
            )}
          </div>
        </div>
      </div>
      
      <div class="w-full md:w-80 space-y-6">
         {currentCard.value && (
             <>
                <GlossaryPanel terms={glossaryTerms.value} />
                <CrossReferencePanel references={crossReferences.value} />
             </>
         )}
      </div>
    </div>
  );
}

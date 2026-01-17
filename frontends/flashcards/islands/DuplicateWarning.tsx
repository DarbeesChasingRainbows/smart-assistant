/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { DuplicateCheckResult } from "../utils/api.ts";

interface DuplicateWarningProps {
  deckId: string;
  question: string;
  onDismiss?: () => void;
  debounceMs?: number;
}

/**
 * Component that checks for duplicate questions and displays a warning.
 * Debounces the check to avoid excessive API calls while typing.
 */
export default function DuplicateWarning({
  deckId,
  question,
  onDismiss,
  debounceMs = 500,
}: DuplicateWarningProps) {
  const result = useSignal<DuplicateCheckResult | null>(null);
  const loading = useSignal(false);
  const dismissed = useSignal(false);

  useEffect(() => {
    if (!question || question.length < 10 || dismissed.value) {
      result.value = null;
      return;
    }

    loading.value = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/flashcards/check-duplicates?deckId=${deckId}&question=${
            encodeURIComponent(question)
          }`,
        );
        if (response.ok) {
          result.value = await response.json();
        }
      } catch (e) {
        console.error("Failed to check duplicates:", e);
      } finally {
        loading.value = false;
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [question, deckId, dismissed.value]);

  const handleDismiss = () => {
    dismissed.value = true;
    result.value = null;
    onDismiss?.();
  };

  if (loading.value) {
    return (
      <div class="text-sm text-gray-500 flex items-center gap-2">
        <span class="loading loading-spinner loading-xs"></span>
        Checking for similar questions...
      </div>
    );
  }

  if (!result.value?.hasSimilar || dismissed.value) {
    return null;
  }

  return (
    <div class="alert alert-warning shadow-sm">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div class="flex-1">
        <h4 class="font-medium">Similar question found</h4>
        <div class="text-sm mt-1 space-y-2">
          {result.value.similarCards.slice(0, 3).map((card) => (
            <div key={card.id} class="bg-white/50 rounded p-2">
              <div class="font-medium text-xs text-gray-600">
                Existing question:
              </div>
              <div class="text-sm">
                {card.question.substring(0, 100)}
                {card.question.length > 100 ? "..." : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        onClick={handleDismiss}
        title="Dismiss warning"
      >
        Continue Anyway
      </button>
    </div>
  );
}

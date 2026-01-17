/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";

interface CloneDeckButtonProps {
  shareToken: string;
  deckName: string;
}

/**
 * Button component to clone a shared deck into the user's collection.
 */
export default function CloneDeckButton(
  { shareToken, deckName }: CloneDeckButtonProps,
) {
  const isCloning = useSignal(false);
  const showModal = useSignal(false);
  const newName = useSignal(`${deckName} (Copy)`);
  const error = useSignal("");
  const success = useSignal(false);
  const clonedDeckId = useSignal<string | null>(null);

  const handleClone = async () => {
    isCloning.value = true;
    error.value = "";

    try {
      const response = await fetch(`/api/v1/decks/shared/${shareToken}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: newName.value }),
      });

      if (!response.ok) {
        throw new Error("Failed to clone deck");
      }

      const clonedDeck = await response.json();
      clonedDeckId.value = clonedDeck.id;
      success.value = true;
      showModal.value = false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "An error occurred";
    } finally {
      isCloning.value = false;
    }
  };

  if (success.value && clonedDeckId.value) {
    return (
      <div class="flex flex-col items-center gap-3">
        <div class="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Deck cloned successfully!</span>
        </div>
        <a href={`/decks/${clonedDeckId.value}`} class="btn btn-primary">
          View Your Copy
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        class="btn btn-secondary btn-lg"
        onClick={() => showModal.value = true}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        Clone to My Collection
      </button>

      {/* Clone Modal */}
      {showModal.value && (
        <div class="modal modal-open">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Clone Deck</h3>
            <p class="py-4">
              Create your own copy of "{deckName}" that you can edit and
              customize.
            </p>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Name for your copy</span>
              </label>
              <input
                type="text"
                class="input input-bordered"
                value={newName.value}
                onInput={(e) =>
                  newName.value = (e.target as HTMLInputElement).value}
              />
            </div>

            {error.value && (
              <div class="alert alert-error mt-4">
                <span>{error.value}</span>
              </div>
            )}

            <div class="modal-action">
              <button
                type="button"
                class="btn btn-ghost"
                onClick={() => showModal.value = false}
                disabled={isCloning.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={handleClone}
                disabled={isCloning.value || !newName.value.trim()}
              >
                {isCloning.value
                  ? (
                    <>
                      <span class="loading loading-spinner loading-sm"></span>
                      Cloning...
                    </>
                  )
                  : (
                    "Clone Deck"
                  )}
              </button>
            </div>
          </div>
          <div class="modal-backdrop" onClick={() => showModal.value = false}>
          </div>
        </div>
      )}
    </>
  );
}

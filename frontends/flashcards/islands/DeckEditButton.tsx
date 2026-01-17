import { useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";

interface Deck {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  difficultyLevel: string;
}

export default function DeckEditButton({ deck }: { deck: Deck }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const loading = useSignal(false);
  const error = useSignal("");

  // Form state
  const name = useSignal(deck.name);
  const description = useSignal(deck.description || "");
  const category = useSignal(deck.category);
  const subcategory = useSignal(deck.subcategory || "");
  const difficulty = useSignal(deck.difficultyLevel);

  const openModal = () => {
    // Reset form to current deck values
    name.value = deck.name;
    description.value = deck.description || "";
    category.value = deck.category;
    subcategory.value = deck.subcategory || "";
    difficulty.value = deck.difficultyLevel;
    error.value = "";
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleUpdate = async (e: Event) => {
    e.preventDefault();
    loading.value = true;
    error.value = "";

    try {
      const response = await fetch(`/api/v1/decks/${deck.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value,
          description: description.value,
          category: category.value,
          subcategory: subcategory.value,
          difficultyLevel: difficulty.value,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      // Close modal and reload page to show changes
      closeModal();
      globalThis.location.reload();
    } catch (err: unknown) {
      error.value = `Failed to update deck: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      loading.value = false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        class="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50"
        title="Edit Deck"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      <dialog ref={dialogRef} class="modal text-left">
        <div class="modal-box w-11/12 max-w-xl">
          <h3 class="font-bold text-lg mb-4">Edit Deck</h3>

          {error.value && (
            <div class="alert alert-error mb-4 text-sm py-2">
              <span>{error.value}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name</span>
              </label>
              <input
                type="text"
                value={name.value}
                onInput={(e) =>
                  name.value = (e.target as HTMLInputElement).value}
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Description</span>
              </label>
              <textarea
                value={description.value}
                onInput={(e) =>
                  description.value = (e.target as HTMLTextAreaElement).value}
                class="textarea textarea-bordered w-full"
                rows={3}
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Category</span>
                </label>
                <input
                  type="text"
                  value={category.value}
                  onInput={(e) =>
                    category.value = (e.target as HTMLInputElement).value}
                  class="input input-bordered w-full"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Subcategory</span>
                </label>
                <input
                  type="text"
                  value={subcategory.value}
                  onInput={(e) =>
                    subcategory.value = (e.target as HTMLInputElement).value}
                  class="input input-bordered w-full"
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Difficulty</span>
              </label>
              <select
                value={difficulty.value}
                onChange={(e) =>
                  difficulty.value = (e.target as HTMLSelectElement).value}
                class="select select-bordered w-full"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={loading.value}
              >
                {loading.value ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" onClick={closeModal}>close</button>
        </form>
      </dialog>
    </>
  );
}

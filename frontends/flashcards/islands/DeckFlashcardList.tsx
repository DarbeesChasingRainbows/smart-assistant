import { useSignal } from "@preact/signals";
import MarkdownEditor from "./MarkdownEditor.tsx";
import Modal from "../components/ui/Modal.tsx";
import Alert from "../components/ui/Alert.tsx";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
  createdAt: string;
}

interface Props {
  deckId: string;
  initialFlashcards: Flashcard[];
}

export default function DeckFlashcardList(
  { deckId, initialFlashcards }: Props,
) {
  const flashcards = useSignal<Flashcard[]>(initialFlashcards);
  const loading = useSignal(false);
  const error = useSignal("");
  const success = useSignal("");

  // Modal state signals
  const editModalOpen = useSignal(false);
  const deleteModalOpen = useSignal(false);

  // Form signals
  const editingId = useSignal<string | null>(null);
  const editQuestion = useSignal("");
  const editAnswer = useSignal("");
  const deleteId = useSignal<string | null>(null);

  // Open Add/Edit modal
  const openEditModal = (card?: Flashcard) => {
    error.value = "";
    success.value = "";
    if (card) {
      editingId.value = card.id;
      editQuestion.value = card.question;
      editAnswer.value = card.answer;
    } else {
      editingId.value = null; // null means creating new
      editQuestion.value = "";
      editAnswer.value = "";
    }
    editModalOpen.value = true;
  };

  const closeEditModal = () => {
    editModalOpen.value = false;
    editingId.value = null;
    editQuestion.value = "";
    editAnswer.value = "";
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();

    if (!editQuestion.value.trim() || !editAnswer.value.trim()) {
      error.value = "Please fill in both question and answer";
      return;
    }

    try {
      loading.value = true;
      error.value = "";

      const isNew = !editingId.value;
      const url = isNew
        ? "/api/v1/flashcards"
        : `/api/v1/flashcards/${editingId.value}`;
      const method = isNew ? "POST" : "PUT";

      const body: { question: string; answer: string; deckId?: string } = {
        question: editQuestion.value,
        answer: editAnswer.value,
      };

      if (isNew) {
        body.deckId = deckId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to save flashcard");
      }

      const savedCard = await response.json();

      if (isNew) {
        flashcards.value = [...flashcards.value, savedCard];
        success.value = "Flashcard created successfully";
      } else {
        flashcards.value = flashcards.value.map((c) =>
          c.id === editingId.value ? savedCard : c
        );
        success.value = "Flashcard updated successfully";
      }

      closeEditModal();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  };

  const openDeleteModal = (id: string) => {
    deleteId.value = id;
    deleteModalOpen.value = true;
  };

  const closeDeleteModal = () => {
    deleteModalOpen.value = false;
    deleteId.value = null;
  };

  const handleDelete = async () => {
    if (!deleteId.value) return;

    try {
      loading.value = true;
      const response = await fetch(`/api/v1/flashcards/${deleteId.value}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete flashcard");
      }

      flashcards.value = flashcards.value.filter((c) =>
        c.id !== deleteId.value
      );
      success.value = "Flashcard deleted successfully";
      closeDeleteModal();
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  };

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold">Cards ({flashcards.value.length})</h2>
        <button
          type="button"
          onClick={() => openEditModal()}
          class="btn btn-primary btn-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Card
        </button>
      </div>

      {error.value && (
        <Alert
          variant="error"
          onDismiss={() => error.value = ""}
        >
          {error.value}
        </Alert>
      )}

      {success.value && (
        <Alert
          variant="success"
          onDismiss={() => success.value = ""}
        >
          {success.value}
        </Alert>
      )}

      <div class="grid gap-4">
        {flashcards.value.map((card) => (
          <div
            key={card.id}
            class="card bg-base-100 shadow-sm border border-base-200"
          >
            <div class="card-body p-4">
              <div class="flex justify-between items-start gap-4">
                <div class="flex-1 space-y-2">
                  <div>
                    <span class="badge badge-ghost badge-sm mb-1">
                      Question
                    </span>
                    <p class="font-medium">{card.question}</p>
                  </div>
                  <div class="pt-2 border-t border-base-200">
                    <span class="badge badge-ghost badge-sm mb-1">Answer</span>
                    <p class="text-gray-600">{card.answer}</p>
                  </div>
                </div>
                <div class="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(card)}
                    class="min-h-[44px] px-3 py-2 flex items-center gap-2 bg-[#1a1a1a] border border-[#333] hover:border-[#00d9ff] transition-colors text-sm"
                    style="border-radius: 0;"
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
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(card.id)}
                    class="min-h-[44px] px-3 py-2 flex items-center gap-2 bg-[#1a1a1a] border border-[#ff4444] hover:bg-[#ff4444]/10 transition-colors text-sm text-[#ff4444]"
                    style="border-radius: 0;"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {flashcards.value.length === 0 && (
          <div class="text-center py-8 text-gray-500 bg-base-100 rounded-lg border border-dashed border-base-300">
            No cards in this deck yet. Add one to get started!
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      <Modal
        open={editModalOpen.value}
        onClose={closeEditModal}
        title={editingId.value ? "Edit Card" : "New Card"}
        subtitle={editingId.value
          ? "Update the flashcard question and answer"
          : "Add a new flashcard to your deck"}
        variant="accent"
        maxWidth="large"
        preventClose={loading.value}
        footer={
          <>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border-2 border-[#333] hover:border-[#666] text-[#ddd] transition-colors font-mono"
              onClick={closeEditModal}
              disabled={loading.value}
              style="border-radius: 0;"
            >
              Cancel
            </button>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 bg-[#00d9ff]/10 border-2 border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/20 transition-colors font-mono"
              onClick={handleSave}
              disabled={loading.value}
              style="border-radius: 0;"
            >
              {loading.value ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} class="space-y-4">
          <div class="form-control">
            <MarkdownEditor
              label="Question"
              value={editQuestion.value}
              onInput={(val) => editQuestion.value = val}
              placeholder="Enter question..."
              required
              rows={5}
              entityId={editingId.value || deckId}
              entityType={editingId.value ? "flashcard" : "deck"}
            />
          </div>
          <div class="form-control">
            <MarkdownEditor
              label="Answer"
              value={editAnswer.value}
              onInput={(val) => editAnswer.value = val}
              placeholder="Enter answer..."
              required
              rows={5}
              entityId={editingId.value || deckId}
              entityType={editingId.value ? "flashcard" : "deck"}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen.value}
        onClose={closeDeleteModal}
        title="Delete Card?"
        variant="error"
        maxWidth="small"
        preventClose={loading.value}
        footer={
          <>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border-2 border-[#333] hover:border-[#666] text-[#ddd] transition-colors font-mono"
              onClick={closeDeleteModal}
              disabled={loading.value}
              style="border-radius: 0;"
            >
              Cancel
            </button>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 bg-[#ff4444]/10 border-2 border-[#ff4444] text-[#ff4444] hover:bg-[#ff4444]/20 transition-colors font-mono"
              onClick={handleDelete}
              disabled={loading.value}
              style="border-radius: 0;"
            >
              {loading.value ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p class="text-[#ddd]">
          Are you sure you want to delete this card? This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}

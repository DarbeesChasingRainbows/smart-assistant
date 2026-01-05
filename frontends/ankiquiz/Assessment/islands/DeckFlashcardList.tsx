import { useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import MarkdownEditor from "./MarkdownEditor.tsx";

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

export default function DeckFlashcardList({ deckId, initialFlashcards }: Props) {
  const flashcards = useSignal<Flashcard[]>(initialFlashcards);
  const loading = useSignal(false);
  const error = useSignal("");
  const success = useSignal("");

  // Dialog refs
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

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
    editDialogRef.current?.showModal();
  };

  const closeEditModal = () => {
    editDialogRef.current?.close();
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
      const url = isNew ? "/api/v1/flashcards" : `/api/v1/flashcards/${editingId.value}`;
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
        flashcards.value = flashcards.value.map(c => 
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
    deleteDialogRef.current?.showModal();
  };

  const closeDeleteModal = () => {
    deleteDialogRef.current?.close();
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

      flashcards.value = flashcards.value.filter(c => c.id !== deleteId.value);
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Card
        </button>
      </div>

      {error.value && (
        <div class="alert alert-error text-sm py-2">
          <span>{error.value}</span>
        </div>
      )}

      {success.value && (
        <div class="alert alert-success text-sm py-2">
          <span>{success.value}</span>
        </div>
      )}

      <div class="grid gap-4">
        {flashcards.value.map((card) => (
          <div key={card.id} class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body p-4">
              <div class="flex justify-between items-start gap-4">
                <div class="flex-1 space-y-2">
                  <div>
                    <span class="badge badge-ghost badge-sm mb-1">Question</span>
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
                    class="btn btn-ghost btn-xs"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    type="button"
                    onClick={() => openDeleteModal(card.id)} 
                    class="btn btn-ghost btn-xs text-error"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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

      {/* Edit Modal */}
      <dialog ref={editDialogRef} class="modal">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">{editingId.value ? 'Edit Card' : 'New Card'}</h3>
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
            <div class="modal-action">
              <button type="button" class="btn" onClick={closeEditModal}>Cancel</button>
              <button type="submit" class="btn btn-primary" disabled={loading.value}>
                {loading.value ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" onClick={closeEditModal}>close</button>
        </form>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog ref={deleteDialogRef} class="modal">
        <div class="modal-box">
          <h3 class="font-bold text-lg text-error">Delete Card?</h3>
          <p class="py-4">Are you sure you want to delete this card? This action cannot be undone.</p>
          <div class="modal-action">
            <button type="button" class="btn" onClick={closeDeleteModal}>Cancel</button>
            <button 
              type="button" 
              class="btn btn-error" 
              onClick={handleDelete}
              disabled={loading.value}
            >
              {loading.value ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button type="button" onClick={closeDeleteModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}

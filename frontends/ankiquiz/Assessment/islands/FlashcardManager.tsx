import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import MarkdownEditor from "./MarkdownEditor.tsx";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

interface ImportResult {
  totalCards: number;
  importedCards: number;
  errors: string[];
  deckName: string;
}

export default function FlashcardManager() {
  const flashcards = useSignal<Flashcard[]>([]);
  const loading = useSignal(false);
  const error = useSignal("");
  const success = useSignal("");

  // Form signals
  const question = useSignal("");
  const answer = useSignal("");

  // Edit signals
  const editingId = useSignal<string | null>(null);
  const editQuestion = useSignal("");
  const editAnswer = useSignal("");
  const editDialogRef = useRef<HTMLDialogElement>(null);

  // Load existing flashcards
  const loadFlashcards = async () => {
    try {
      loading.value = true;
      const response = await fetch("/api/cards");
      if (response.ok) {
        const data = await response.json();
        flashcards.value = data;
      }
    } catch (_err) {
      error.value = "Failed to load flashcards";
    } finally {
      loading.value = false;
    }
  };

  // Open edit modal
  const openEditModal = (card: Flashcard) => {
    editingId.value = card.id;
    editQuestion.value = card.question;
    editAnswer.value = card.answer;
    editDialogRef.current?.showModal();
  };

  // Close edit modal
  const closeEditModal = () => {
    editDialogRef.current?.close();
    editingId.value = null;
    editQuestion.value = "";
    editAnswer.value = "";
  };

  // Update flashcard
  const updateFlashcard = async (e: Event) => {
    e.preventDefault();
    
    if (!editingId.value || !editQuestion.value.trim() || !editAnswer.value.trim()) {
      error.value = "Please fill in both question and answer";
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      // Optimistically update local state for immediate feedback
      const originalCards = [...flashcards.value];
      flashcards.value = flashcards.value.map(c => 
        c.id === editingId.value 
          ? { ...c, question: editQuestion.value, answer: editAnswer.value }
          : c
      );

      const response = await fetch(`/api/cards/${editingId.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editQuestion.value,
          answer: editAnswer.value,
        }),
      });

      if (response.ok) {
        success.value = "Flashcard updated successfully!";
        closeEditModal();
        // Background refresh to ensure sync
        loadFlashcards(); 
      } else {
        // Revert optimistic update on failure
        flashcards.value = originalCards;
        const err = await response.text();
        error.value = `Failed to update flashcard: ${err}`;
      }
    } catch (_err) {
      error.value = "Failed to update flashcard";
    } finally {
      loading.value = false;
    }
  };

  // Create single flashcard
  const createFlashcard = async (e: Event) => {
    e.preventDefault();
    
    if (!question.value.trim() || !answer.value.trim()) {
      error.value = "Please fill in both question and answer";
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      const response = await fetch("/api/cards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.value,
          answer: answer.value,
        }),
      });

      if (response.ok) {
        success.value = "Flashcard created successfully!";
        question.value = "";
        answer.value = "";
        await loadFlashcards();
      } else {
        const err = await response.text();
        error.value = `Failed to create flashcard: ${err}`;
      }
    } catch (_err) {
      error.value = "Failed to create flashcard";
    } finally {
      loading.value = false;
    }
  };

  // Import Anki deck
  const importAnkiDeck = async (e: Event) => {
    e.preventDefault();
    
    const fileInput = e.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file) {
      error.value = "Please select a file";
      return;
    }

    if (!file.name.endsWith(".apkg")) {
      error.value = "Please select an Anki deck file (.apkg)";
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/cards/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result: ImportResult = await response.json();
        success.value = `Imported ${result.importedCards} out of ${result.totalCards} cards from "${result.deckName}"`;
        
        if (result.errors.length > 0) {
          error.value = `Import warnings: ${result.errors.slice(0, 3).join(", ")}`;
        }
        
        await loadFlashcards();
      } else {
        const err = await response.text();
        error.value = `Failed to import deck: ${err}`;
      }
    } catch (_err) {
      error.value = "Failed to import deck";
    } finally {
      loading.value = false;
    }
  };

  // Bulk create from text
  const bulkCreateFromText = async (e: Event) => {
    e.preventDefault();
    
    const textInput = e.target as HTMLTextAreaElement;
    const text = textInput.value;
    
    if (!text.trim()) {
      error.value = "Please enter flashcard content";
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      // Parse simple format: Question on one line, Answer on next line, separated by blank line
      const lines = text.trim().split('\n');
      const cards = [];
      
      for (let i = 0; i < lines.length; i += 2) {
        if (i + 1 < lines.length) {
          const question = lines[i].trim();
          const answer = lines[i + 1].trim();
          
          if (question && answer) {
            cards.push({ question, answer });
          }
        }
      }

      if (cards.length === 0) {
        error.value = "No valid flashcards found in text";
        return;
      }

      const response = await fetch("/api/cards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcards: cards }),
      });

      if (response.ok) {
        const result = await response.json();
        success.value = `Created ${result.created} out of ${result.totalRequested} flashcards`;
        textInput.value = "";
        await loadFlashcards();
      } else {
        const err = await response.text();
        error.value = `Failed to create flashcards: ${err}`;
      }
    } catch (_err) {
      error.value = "Failed to create flashcards";
    } finally {
      loading.value = false;
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, []);

  return (
    <div class="max-w-4xl mx-auto p-6 space-y-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">Flashcard Manager</h1>
        
        {/* Error and Success Messages */}
        {error.value && (
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error.value}
          </div>
        )}
        
        {success.value && (
          <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success.value}
          </div>
        )}

        {/* Single Flashcard Creation */}
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">Create Single Flashcard</h2>
          <form onSubmit={createFlashcard} class="space-y-4">
            <div class="form-control">
              <MarkdownEditor
                label="Question"
                value={question.value}
                onInput={(val) => question.value = val}
                placeholder="Enter your question..."
                required
                rows={3}
              />
            </div>
            <div class="form-control">
              <MarkdownEditor
                label="Answer"
                value={answer.value}
                onInput={(val) => answer.value = val}
                placeholder="Enter the answer..."
                required
                rows={5}
              />
            </div>
            <button
              type="submit"
              disabled={loading.value}
              class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading.value ? "Creating..." : "Create Flashcard"}
            </button>
          </form>
        </div>

        {/* Anki Import */}
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">Import Anki Deck (.apkg)</h2>
          <form onSubmit={importAnkiDeck} class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Select .apkg file</label>
              <input
                type="file"
                accept=".apkg"
                onChange={importAnkiDeck}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading.value}
              class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {loading.value ? "Importing..." : "Import Deck"}
            </button>
          </form>
        </div>

        {/* Bulk Text Import */}
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">Bulk Create from Text</h2>
          <form onSubmit={bulkCreateFromText} class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Flashcard Content (Question on one line, answer on the next)
              </label>
              <textarea
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={10}
                placeholder="What is the capital of France?&#10;Paris&#10;&#10;What is 2 + 2?&#10;4"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading.value}
              class="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
            >
              {loading.value ? "Creating..." : "Create All Flashcards"}
            </button>
          </form>
        </div>

        {/* Existing Flashcards */}
        <div>
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            Existing Flashcards ({flashcards.value.length})
          </h2>
          <div class="space-y-3">
            {flashcards.value.map((card) => (
              <div key={card.id} class="border border-gray-200 rounded-lg p-4 relative group">
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button"
                    onClick={() => openEditModal(card)}
                    class="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50"
                    title="Edit Flashcard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
                <div class="font-medium text-gray-800 mb-2 pr-10">{card.question}</div>
                <div class="text-gray-600">{card.answer}</div>
                <div class="text-sm text-gray-400 mt-2">
                  Created: {new Date(card.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {flashcards.value.length === 0 && (
              <div class="text-gray-500 text-center py-8">
                No flashcards yet. Create your first one above!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <dialog ref={editDialogRef} class="modal">
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">Edit Flashcard</h3>
          <form onSubmit={updateFlashcard} class="space-y-4">
            <div class="form-control">
              <MarkdownEditor
                label="Question"
                value={editQuestion.value}
                onInput={(val) => editQuestion.value = val}
                placeholder="Enter your question..."
                required
                rows={3}
              />
            </div>
            <div class="form-control">
              <MarkdownEditor
                label="Answer"
                value={editAnswer.value}
                onInput={(val) => editAnswer.value = val}
                placeholder="Enter the answer..."
                required
                rows={5}
              />
            </div>
            <div class="modal-action">
              <button 
                type="button" 
                class="btn" 
                onClick={closeEditModal}
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
          <button type="button" onClick={closeEditModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}

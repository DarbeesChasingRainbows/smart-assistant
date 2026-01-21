import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import MarkdownEditor from "./MarkdownEditor.tsx";
import Modal from "../components/ui/Modal.tsx";
import Alert from "../components/ui/Alert.tsx";
import Tooltip from "../components/ui/Tooltip.tsx";
import { RetentionApiClient } from "../utils/api.ts";
import type { Deck } from "../utils/contracts.ts";

interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportResult {
  totalCards: number;
  importedCards: number;
  errors: string[];
  deckName: string;
}

export default function FlashcardManager() {
  const flashcards = useSignal<Flashcard[]>([]);
  const decks = useSignal<Deck[]>([]);
  const selectedDeck = useSignal<string>("");
  const loading = useSignal(false);
  const error = useSignal("");
  const success = useSignal("");

  // Form signals
  const question = useSignal("");
  const answer = useSignal("");

  // Edit modal state
  const editModalOpen = useSignal(false);
  const editingId = useSignal<string | null>(null);
  const editQuestion = useSignal("");
  const editAnswer = useSignal("");

  // API client
  const api = new RetentionApiClient();

  // Load decks
  const loadDecks = async () => {
    try {
      loading.value = true;
      const data = await api.getDecks();
      decks.value = data;
      if (data.length > 0 && !selectedDeck.value) {
        selectedDeck.value = data[0].id;
      }
    } catch (_err) {
      error.value = "Failed to load decks";
    } finally {
      loading.value = false;
    }
  };

  // Load existing flashcards
  const loadFlashcards = async () => {
    if (!selectedDeck.value) return;
    
    try {
      loading.value = true;
      const data = await api.getFlashcards(selectedDeck.value);
      flashcards.value = data;
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
    editModalOpen.value = true;
  };

  // Close edit modal
  const closeEditModal = () => {
    editModalOpen.value = false;
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
      
      // Find the card to update
      const card = flashcards.value.find(c => c.id === editingId.value);
      if (!card) {
        error.value = "Flashcard not found";
        return;
      }

      const updatedCard = await api.updateFlashcard({
        ...card,
        question: editQuestion.value,
        answer: editAnswer.value,
        metadata: null,
        scheduling: {
          interval: 1,
          repetitions: 0,
          easeFactor: 2.5,
          nextReviewDate: new Date().toISOString(),
        },
      });
      
      // Update local state
      flashcards.value = flashcards.value.map(c => 
        c.id === editingId.value ? updatedCard : c
      );
      
      success.value = "Flashcard updated successfully!";
      closeEditModal();
    } catch (err) {
      error.value = `Failed to update flashcard: ${err}`;
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

    if (!selectedDeck.value) {
      error.value = "Please select a deck first";
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      const newCard = await api.createFlashcard({
        deckId: selectedDeck.value,
        question: question.value,
        answer: answer.value,
      });
      
      flashcards.value = [...flashcards.value, newCard];
      
      // Clear form
      question.value = "";
      answer.value = "";
      
      success.value = "Flashcard created successfully!";
      setTimeout(() => success.value = "", 3000);
    } catch (err) {
      error.value = `Failed to create flashcard: ${err}`;
    } finally {
      loading.value = false;
    }
  };

  // Delete flashcard
  const deleteFlashcard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) {
      return;
    }

    try {
      loading.value = true;
      error.value = "";
      
      await api.deleteFlashcard(cardId);
      
      // Remove from local state
      flashcards.value = flashcards.value.filter(c => c.id !== cardId);
      
      success.value = "Flashcard deleted successfully!";
      setTimeout(() => success.value = "", 3000);
    } catch (err) {
      error.value = `Failed to delete flashcard: ${err}`;
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
    loadDecks();
  }, []);

  useEffect(() => {
    if (selectedDeck.value) {
      loadFlashcards();
    }
  }, [selectedDeck.value]);

  return (
    <div class="max-w-4xl mx-auto p-6 space-y-8">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">Flashcard Manager</h1>
        
        {/* Error and Success Messages */}
        {error.value && (
          <Alert
            variant="error"
            onDismiss={() => error.value = ""}
            class="mb-4"
          >
            {error.value}
          </Alert>
        )}

        {success.value && (
          <Alert
            variant="success"
            onDismiss={() => success.value = ""}
            class="mb-4"
          >
            {success.value}
          </Alert>
        )}

        {/* Deck Selection */}
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">Select Deck</h2>
          <select 
            class="select select-bordered w-full max-w-xs"
            value={selectedDeck.value}
            onChange={(e) => selectedDeck.value = e.currentTarget.value}
          >
            <option value="">Choose a deck...</option>
            {decks.value.map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.cardCount} cards)
              </option>
            ))}
          </select>
        </div>

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
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Tooltip content="Edit this flashcard (modify question and answer)" position="top">
                    <button
                      type="button"
                      onClick={() => openEditModal(card)}
                      class="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50 min-h-[44px] flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span class="text-sm">Edit</span>
                    </button>
                  </Tooltip>
                  <Tooltip content="Permanently delete this flashcard (cannot be undone)" position="top">
                    <button
                      type="button"
                      onClick={() => deleteFlashcard(card.id)}
                      class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 min-h-[44px] flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span class="text-sm">Delete</span>
                    </button>
                  </Tooltip>
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
      <Modal
        open={editModalOpen.value}
        onClose={closeEditModal}
        title="Edit Flashcard"
        subtitle="Update the question and answer for this flashcard"
        variant="accent"
        maxWidth="large"
        footer={
          <>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 border-2 border-[#444] text-[#ddd] hover:border-[#00d9ff] hover:text-[#00d9ff] transition-colors font-mono"
              onClick={closeEditModal}
              style="border-radius: 0;"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-flashcard-form"
              class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border-2 border-[#00d9ff] text-[#0a0a0a] hover:bg-[#00b8d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono font-semibold"
              disabled={loading.value}
              style="border-radius: 0;"
            >
              {loading.value ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <form id="edit-flashcard-form" onSubmit={updateFlashcard} class="space-y-4">
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
        </form>
      </Modal>
    </div>
  );
}

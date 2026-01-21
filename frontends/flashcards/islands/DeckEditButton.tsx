import { useSignal } from "@preact/signals";
import Modal from "../components/ui/Modal.tsx";
import Alert from "../components/ui/Alert.tsx";
import Tooltip from "../components/ui/Tooltip.tsx";
import FormInput from "../components/forms/FormInput.tsx";
import FormSelect from "../components/forms/FormSelect.tsx";
import FormTextarea from "../components/forms/FormTextarea.tsx";

interface Deck {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  difficultyLevel: string;
}

export default function DeckEditButton({ deck }: { deck: Deck }) {
  const isOpen = useSignal(false);
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
    isOpen.value = true;
  };

  const closeModal = () => {
    isOpen.value = false;
  };

  const handleSubmit = async (e: Event) => {
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
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  };

  return (
    <>
      <Tooltip content="Edit deck metadata (name, description, category, difficulty)" position="top">
        <button
          type="button"
          onClick={openModal}
          class="min-h-[44px] px-4 py-2 bg-[#0a0a0a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors flex items-center gap-2"
          style="border-radius: 0;"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="font-mono text-sm">Edit Deck</span>
        </button>
      </Tooltip>

      <Modal
        open={isOpen.value}
        onClose={closeModal}
        title="Edit Deck"
        subtitle="Update deck information and settings"
        variant="accent"
        maxWidth="large"
        preventClose={loading.value}
        footer={
          <>
            <button
              type="button"
              class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#444] text-[#ddd] hover:bg-[#222] transition-colors"
              style="border-radius: 0;"
              onClick={closeModal}
              disabled={loading.value}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-deck-form"
              class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border border-[#00d9ff] text-[#0a0a0a] hover:bg-[#00b8dd] transition-colors font-semibold"
              style="border-radius: 0;"
              disabled={loading.value}
            >
              {loading.value ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        {error.value && (
          <Alert variant="error" onDismiss={() => error.value = ""} class="mb-4">
            {error.value}
          </Alert>
        )}

        <form id="edit-deck-form" onSubmit={handleSubmit} class="space-y-4">
          <FormInput
            label="Name"
            value={name.value}
            onChange={(e) => name.value = (e.target as HTMLInputElement).value}
            required
            placeholder="e.g., Spanish Vocabulary"
          />

          <FormTextarea
            label="Description"
            value={description.value}
            onChange={(e) => description.value = (e.target as HTMLTextAreaElement).value}
            rows={3}
            placeholder="Brief description of this deck..."
          />

          <div class="grid grid-cols-2 gap-4">
            <FormInput
              label="Category"
              value={category.value}
              onChange={(e) => category.value = (e.target as HTMLInputElement).value}
              required
              placeholder="e.g., Languages"
            />

            <FormInput
              label="Subcategory"
              value={subcategory.value}
              onChange={(e) => subcategory.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., Spanish"
            />
          </div>

          <FormSelect
            label="Difficulty"
            value={difficulty.value}
            onChange={(e) => difficulty.value = (e.target as HTMLSelectElement).value}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </FormSelect>
        </form>
      </Modal>
    </>
  );
}

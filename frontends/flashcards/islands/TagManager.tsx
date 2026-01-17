/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Tag } from "../utils/api.ts";

interface TagManagerProps {
  flashcardId: string;
  onTagsUpdated?: () => void;
}

/**
 * Component for managing tags on a flashcard.
 * Allows adding existing tags or creating new ones.
 */
export default function TagManager(
  { flashcardId, onTagsUpdated }: TagManagerProps,
) {
  const allTags = useSignal<Tag[]>([]);
  const flashcardTags = useSignal<Tag[]>([]);
  const loading = useSignal(true);
  const showAddTag = useSignal(false);
  const newTagName = useSignal("");
  const newTagColor = useSignal("#6366f1");
  const isAdding = useSignal(false);

  useEffect(() => {
    loadData();
  }, [flashcardId]);

  const loadData = async () => {
    loading.value = true;
    try {
      const [tagsRes, flashcardTagsRes] = await Promise.all([
        fetch("/api/v1/tags"),
        fetch(`/api/v1/tags/flashcard/${flashcardId}`),
      ]);

      if (tagsRes.ok) allTags.value = await tagsRes.json();
      if (flashcardTagsRes.ok) {
        flashcardTags.value = await flashcardTagsRes.json();
      }
    } catch (e) {
      console.error("Failed to load tags:", e);
    } finally {
      loading.value = false;
    }
  };

  const addTagToFlashcard = async (tagId: string) => {
    try {
      const response = await fetch(
        `/api/v1/tags/flashcard/${flashcardId}/tag/${tagId}`,
        {
          method: "POST",
        },
      );
      if (response.ok) {
        await loadData();
        onTagsUpdated?.();
      }
    } catch (e) {
      console.error("Failed to add tag:", e);
    }
  };

  const removeTagFromFlashcard = async (tagId: string) => {
    try {
      const response = await fetch(
        `/api/v1/tags/flashcard/${flashcardId}/tag/${tagId}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        await loadData();
        onTagsUpdated?.();
      }
    } catch (e) {
      console.error("Failed to remove tag:", e);
    }
  };

  const createAndAddTag = async () => {
    if (!newTagName.value.trim()) return;

    isAdding.value = true;
    try {
      const response = await fetch("/api/v1/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.value,
          color: newTagColor.value,
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        await addTagToFlashcard(newTag.id);
        newTagName.value = "";
        showAddTag.value = false;
      }
    } catch (e) {
      console.error("Failed to create tag:", e);
    } finally {
      isAdding.value = false;
    }
  };

  const availableTags = allTags.value.filter(
    (tag) => !flashcardTags.value.some((ft) => ft.id === tag.id),
  );

  if (loading.value) {
    return <span class="loading loading-spinner loading-sm"></span>;
  }

  return (
    <div class="space-y-2">
      {/* Current tags */}
      <div class="flex flex-wrap gap-1">
        {flashcardTags.value.map((tag) => (
          <span
            key={tag.id}
            class="badge badge-lg gap-1"
            style={tag.color
              ? { backgroundColor: tag.color, color: "white" }
              : {}}
          >
            {tag.name}
            <button
              type="button"
              class="btn btn-ghost btn-xs p-0 hover:bg-transparent"
              onClick={() => removeTagFromFlashcard(tag.id)}
              title="Remove tag"
            >
              ×
            </button>
          </span>
        ))}

        {/* Add tag button */}
        <div class="dropdown dropdown-end">
          <button
            type="button"
            tabIndex={0}
            class="badge badge-outline badge-lg cursor-pointer hover:bg-gray-100"
          >
            + Add Tag
          </button>
          <div
            tabIndex={0}
            class="dropdown-content z-50 menu p-3 shadow-lg bg-white rounded-box w-64"
          >
            {/* Existing tags */}
            {availableTags.length > 0 && (
              <div class="mb-2">
                <div class="text-xs font-medium text-gray-500 mb-1">
                  Existing Tags
                </div>
                <div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      class="badge badge-lg cursor-pointer hover:opacity-80"
                      style={tag.color
                        ? { backgroundColor: tag.color, color: "white" }
                        : {}}
                      onClick={() => addTagToFlashcard(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create new tag */}
            <div class="border-t pt-2">
              <div class="text-xs font-medium text-gray-500 mb-1">
                Create New Tag
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input input-sm input-bordered flex-1"
                  placeholder="Tag name"
                  value={newTagName.value}
                  onInput={(e) =>
                    newTagName.value = (e.target as HTMLInputElement).value}
                  onKeyDown={(e) => e.key === "Enter" && createAndAddTag()}
                />
                <input
                  type="color"
                  class="w-8 h-8 rounded cursor-pointer"
                  value={newTagColor.value}
                  onInput={(e) =>
                    newTagColor.value = (e.target as HTMLInputElement).value}
                />
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  onClick={createAndAddTag}
                  disabled={isAdding.value || !newTagName.value.trim()}
                >
                  {isAdding.value
                    ? <span class="loading loading-spinner loading-xs"></span>
                    : "+"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

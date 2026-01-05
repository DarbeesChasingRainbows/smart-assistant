/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Tag } from "../utils/api.ts";

interface TagFilterProps {
  onTagsChange: (selectedTagIds: string[]) => void;
  selectedTagIds?: string[];
}

/**
 * Tag filter component for filtering flashcards by tags.
 * Fetches available tags and allows multi-select filtering.
 */
export default function TagFilter({ onTagsChange, selectedTagIds = [] }: TagFilterProps) {
  const tags = useSignal<Tag[]>([]);
  const selected = useSignal<Set<string>>(new Set(selectedTagIds));
  const loading = useSignal(true);
  const showDropdown = useSignal(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await fetch("/api/v1/tags");
      if (response.ok) {
        tags.value = await response.json();
      }
    } catch (e) {
      console.error("Failed to load tags:", e);
    } finally {
      loading.value = false;
    }
  };

  const toggleTag = (tagId: string) => {
    const newSelected = new Set(selected.value);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    selected.value = newSelected;
    onTagsChange(Array.from(newSelected));
  };

  const clearAll = () => {
    selected.value = new Set();
    onTagsChange([]);
  };

  if (loading.value) {
    return (
      <div class="flex items-center gap-2">
        <span class="loading loading-spinner loading-sm"></span>
        <span class="text-sm text-gray-500">Loading tags...</span>
      </div>
    );
  }

  if (tags.value.length === 0) {
    return null;
  }

  return (
    <div class="relative">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn btn-sm btn-outline gap-2"
          onClick={() => showDropdown.value = !showDropdown.value}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Filter by Tags
          {selected.value.size > 0 && (
            <span class="badge badge-primary badge-sm">{selected.value.size}</span>
          )}
        </button>

        {/* Selected tags display */}
        {selected.value.size > 0 && (
          <>
            {tags.value
              .filter(tag => selected.value.has(tag.id))
              .map(tag => (
                <span
                  key={tag.id}
                  class="badge badge-lg gap-1"
                  style={tag.color ? { backgroundColor: tag.color, color: "white" } : {}}
                >
                  {tag.name}
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs p-0"
                    onClick={() => toggleTag(tag.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onClick={clearAll}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown.value && (
        <div class="absolute z-50 mt-2 w-64 bg-white rounded-lg shadow-xl border p-3">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium text-sm">Select Tags</span>
            <button
              type="button"
              class="btn btn-ghost btn-xs"
              onClick={() => showDropdown.value = false}
            >
              ×
            </button>
          </div>
          <div class="max-h-48 overflow-y-auto space-y-1">
            {tags.value.map(tag => (
              <label
                key={tag.id}
                class={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                  selected.value.has(tag.id) ? "bg-primary/10" : ""
                }`}
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm checkbox-primary"
                  checked={selected.value.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                />
                <span
                  class="badge"
                  style={tag.color ? { backgroundColor: tag.color, color: "white" } : {}}
                >
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

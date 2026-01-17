/** @jsxImportSource preact */
import type { CrossReference } from "../utils/api.ts";

interface CrossReferencePanelProps {
  references: CrossReference[];
}

export default function CrossReferencePanel(
  { references }: CrossReferencePanelProps,
) {
  if (references.length === 0) {
    return (
      <div class="p-4 bg-gray-100 rounded-lg text-gray-500 italic mt-4">
        No cross-references available.
      </div>
    );
  }

  return (
    <div class="card bg-base-100 shadow-lg mt-4 border border-gray-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm uppercase tracking-wide text-gray-500 mb-2">
          Related Content
        </h3>
        <ul class="space-y-2">
          {references.map((ref) => (
            <li
              key={ref.id}
              class="flex items-center gap-2 p-2 hover:bg-base-200 rounded transition-colors"
            >
              <span
                class={`badge badge-sm ${
                  ref.referenceType === "Prerequisite"
                    ? "badge-warning"
                    : "badge-ghost"
                }`}
              >
                {ref.referenceType}
              </span>
              <span class="text-sm">
                {/* Since we don't have the target name in the CrossReference object yet, we show generic link */}
                {ref.targetType === "deck" ? "Related Deck" : "Related Card"}
              </span>
              {/* Future: Add link logic */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

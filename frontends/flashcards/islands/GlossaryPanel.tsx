/** @jsxImportSource preact */
import type { GlossaryTerm } from "../utils/api.ts";

interface GlossaryPanelProps {
  terms: GlossaryTerm[];
}

export default function GlossaryPanel({ terms }: GlossaryPanelProps) {
  if (terms.length === 0) {
    return (
      <div class="p-4 bg-gray-100 rounded-lg text-gray-500 italic mt-4">
        No glossary terms available for this card.
      </div>
    );
  }

  return (
    <div class="card bg-base-100 shadow-lg mt-4 border border-gray-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm uppercase tracking-wide text-gray-500 mb-2">Glossary</h3>
        <ul class="space-y-3">
          {terms.map((term) => (
            <li key={term.id} class="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <div class="font-bold text-primary flex items-baseline">
                {term.term}
                {term.pronunciation && (
                  <span class="ml-2 text-xs font-normal text-gray-500 italic">({term.pronunciation})</span>
                )}
              </div>
              <div class="text-sm mt-1 text-gray-700">{term.definition}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

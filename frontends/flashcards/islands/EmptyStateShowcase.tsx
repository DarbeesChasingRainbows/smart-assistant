/** @jsxImportSource preact */
import { useSignal } from "@preact/signals";
import EmptyState, {
  NoDecksEmptyState,
  NoCardsEmptyState,
  AllDoneEmptyState,
  NoResultsEmptyState,
} from "./EmptyState.tsx";

/**
 * EmptyStateShowcase Component
 *
 * Demonstrates all empty state variants and predefined scenarios.
 * Use this component in development to preview empty states and test interactions.
 *
 * Usage:
 * - Add as an island in a showcase route: routes/showcase/empty-states.tsx
 * - Helpful for design review and QA testing
 * - Shows all variants side-by-side for comparison
 */

export default function EmptyStateShowcase() {
  const activeDemo = useSignal<string | null>(null);
  const searchTerm = useSignal("kubernetes");

  const handleAction = (action: string) => {
    activeDemo.value = `Action: ${action}`;
    // Auto-clear after 2 seconds
    setTimeout(() => {
      activeDemo.value = null;
    }, 2000);
  };

  return (
    <div class="min-h-screen bg-[#0a0a0a] p-8">
      <div class="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header class="text-center space-y-4">
          <h1 class="text-3xl font-mono font-bold text-[#00d9ff]">
            Empty State Showcase
          </h1>
          <p class="text-sm font-mono text-[#888]">
            Sci-Fi HUD Design System • Phase 3 UI/UX Polish
          </p>
        </header>

        {/* Active Demo Toast */}
        {activeDemo.value && (
          <div
            class="fixed top-4 right-4 bg-[#1a1a1a] border-2 border-[#00ff88] px-6 py-3 font-mono text-sm text-[#00ff88] z-50"
            style={{ borderRadius: "0" }}
          >
            {activeDemo.value}
          </div>
        )}

        {/* Predefined Scenarios */}
        <section class="space-y-6">
          <h2 class="text-xl font-mono font-semibold text-[#00d9ff] border-b border-[#333] pb-2">
            Predefined Scenarios
          </h2>

          <div class="grid md:grid-cols-2 gap-8">
            {/* No Decks */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                1. No Decks (Action)
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <NoDecksEmptyState
                  onCreateDeck={() => handleAction("Create Deck clicked")}
                />
              </div>
            </div>

            {/* No Cards */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                2. No Cards in Deck (Action with Secondary)
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <NoCardsEmptyState
                  onCreateCard={() => handleAction("Create Card clicked")}
                  onImportCards={() => handleAction("Import Cards clicked")}
                />
              </div>
            </div>

            {/* All Done */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                3. All Done (Celebratory)
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <AllDoneEmptyState
                  onReviewAgain={() => handleAction("Review Again clicked")}
                  onViewStats={() => handleAction("View Stats clicked")}
                />
              </div>
            </div>

            {/* No Results */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                4. Search No Results (Informational)
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <NoResultsEmptyState
                  onClearFilters={() => {
                    handleAction("Clear Filters clicked");
                    searchTerm.value = "";
                  }}
                  searchTerm={searchTerm.value}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Variant Examples */}
        <section class="space-y-6">
          <h2 class="text-xl font-mono font-semibold text-[#00d9ff] border-b border-[#333] pb-2">
            Variant Comparison
          </h2>

          <div class="grid md:grid-cols-3 gap-8">
            {/* Informational */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                Informational Variant
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <EmptyState
                  variant="informational"
                  title="No Network"
                  description="Check your connection and try again"
                  illustration="no-results"
                  primaryAction={{
                    label: "Retry",
                    onClick: () => handleAction("Retry clicked"),
                  }}
                />
              </div>
              <div class="text-xs font-mono text-[#666] space-y-1">
                <p>• Transparent background</p>
                <p>• Subtle border (#333)</p>
                <p>• Cyan title</p>
                <p>• No immediate action required</p>
              </div>
            </div>

            {/* Action */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                Action Variant
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <EmptyState
                  variant="action"
                  title="Get Started"
                  description="Create your first item to unlock this feature"
                  illustration="no-cards"
                  primaryAction={{
                    label: "Create Item",
                    onClick: () => handleAction("Create Item clicked"),
                  }}
                />
              </div>
              <div class="text-xs font-mono text-[#666] space-y-1">
                <p>• Dark background (#0a0a0a)</p>
                <p>• Cyan border (#00d9ff)</p>
                <p>• Cyan title</p>
                <p>• Requires user action</p>
              </div>
            </div>

            {/* Celebratory */}
            <div class="space-y-3">
              <h3 class="text-sm font-mono font-medium text-[#aaa]">
                Celebratory Variant
              </h3>
              <div class="bg-[#0a0a0a] border border-[#333] p-6">
                <EmptyState
                  variant="celebratory"
                  title="Perfect Score! 🎯"
                  description="You aced every question. Outstanding performance!"
                  illustration="all-done"
                  primaryAction={{
                    label: "Continue",
                    onClick: () => handleAction("Continue clicked"),
                  }}
                />
              </div>
              <div class="text-xs font-mono text-[#666] space-y-1">
                <p>• Green tint background (#001a0f)</p>
                <p>• Green border (#00ff88)</p>
                <p>• Green title</p>
                <p>• Positive achievement state</p>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Illustration Example */}
        <section class="space-y-6">
          <h2 class="text-xl font-mono font-semibold text-[#00d9ff] border-b border-[#333] pb-2">
            Custom Illustration
          </h2>

          <div class="bg-[#0a0a0a] border border-[#333] p-8">
            <EmptyState
              variant="action"
              title="Custom SVG Example"
              description="You can provide custom SVG markup for unique scenarios"
              illustration="custom"
              customSvg={`
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="30" y="30" width="60" height="60" stroke="#00d9ff" stroke-width="2.5" fill="none" />
                  <line x1="30" y1="60" x2="90" y2="60" stroke="#00d9ff" stroke-width="2" />
                  <line x1="60" y1="30" x2="60" y2="90" stroke="#00d9ff" stroke-width="2" />
                  <circle cx="60" cy="60" r="15" stroke="#00ff88" stroke-width="2" fill="none" />
                  <polyline points="40,20 60,10 80,20" stroke="#00d9ff" stroke-width="2" fill="none" />
                  <polyline points="40,100 60,110 80,100" stroke="#00d9ff" stroke-width="2" fill="none" />
                  <polyline points="20,40 10,60 20,80" stroke="#00d9ff" stroke-width="2" fill="none" />
                  <polyline points="100,40 110,60 100,80" stroke="#00d9ff" stroke-width="2" fill="none" />
                </svg>
              `}
              primaryAction={{
                label: "Custom Action",
                onClick: () => handleAction("Custom action clicked"),
              }}
            />
          </div>
        </section>

        {/* Accessibility Features */}
        <section class="space-y-6">
          <h2 class="text-xl font-mono font-semibold text-[#00d9ff] border-b border-[#333] pb-2">
            Accessibility Features
          </h2>

          <div class="grid md:grid-cols-2 gap-8">
            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-4">
              <h3 class="text-sm font-mono font-semibold text-[#00ff88]">
                ✓ Kid Test
              </h3>
              <p class="text-xs font-mono text-[#aaa] leading-relaxed">
                All interactive elements have visible text labels. Icons never appear alone.
                A child can understand what each button does by reading the text.
              </p>
              <div class="flex gap-3">
                <button
                  class="min-h-[44px] px-4 border-2 border-[#00d9ff] text-[#00d9ff] font-mono text-sm"
                  style={{ borderRadius: "0" }}
                >
                  Create Deck
                </button>
                <button
                  class="min-h-[44px] px-4 border-2 border-[#555] text-[#aaa] font-mono text-sm"
                  style={{ borderRadius: "0" }}
                >
                  Import Cards
                </button>
              </div>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-4">
              <h3 class="text-sm font-mono font-semibold text-[#00ff88]">
                ✓ Fitts's Law
              </h3>
              <p class="text-xs font-mono text-[#aaa] leading-relaxed">
                All interactive elements meet minimum 44px × 44px touch targets.
                Reduces errors and frustration, especially on mobile devices.
              </p>
              <div class="space-y-2">
                <div class="text-xs font-mono text-[#666]">
                  Min height: <span class="text-[#00d9ff]">44px</span>
                </div>
                <div class="text-xs font-mono text-[#666]">
                  Min width: <span class="text-[#00d9ff]">120px</span>
                </div>
                <div class="text-xs font-mono text-[#666]">
                  Padding: <span class="text-[#00d9ff]">px-6 py-3</span>
                </div>
              </div>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-4">
              <h3 class="text-sm font-mono font-semibold text-[#00ff88]">
                ✓ Semantic HTML
              </h3>
              <p class="text-xs font-mono text-[#aaa] leading-relaxed">
                Uses proper semantic elements: {`<section>`}, {`<h2>`}, {`<p>`}, {`<button>`}.
                Screen readers can navigate and understand the structure.
              </p>
              <code class="block text-xs font-mono text-[#00d9ff] bg-[#0a0a0a] p-3 border border-[#333]">
                {`<section role="status">`}<br />
                {`  <h2>Title</h2>`}<br />
                {`  <p>Description</p>`}<br />
                {`  <button>Action</button>`}<br />
                {`</section>`}
              </code>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-4">
              <h3 class="text-sm font-mono font-semibold text-[#00ff88]">
                ✓ ARIA Attributes
              </h3>
              <p class="text-xs font-mono text-[#aaa] leading-relaxed">
                Dynamic empty states use role="status" and aria-live="polite"
                for screen reader announcements when content changes.
              </p>
              <div class="space-y-2">
                <div class="text-xs font-mono text-[#666]">
                  role=<span class="text-[#00d9ff]">"status"</span>
                </div>
                <div class="text-xs font-mono text-[#666]">
                  aria-live=<span class="text-[#00d9ff]">"polite"</span>
                </div>
                <div class="text-xs font-mono text-[#666]">
                  aria-atomic=<span class="text-[#00d9ff]">"true"</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Design System Reference */}
        <section class="space-y-6">
          <h2 class="text-xl font-mono font-semibold text-[#00d9ff] border-b border-[#333] pb-2">
            Sci-Fi HUD Design System
          </h2>

          <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-3">
              <h3 class="text-sm font-mono font-semibold text-[#aaa]">Colors</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 border-2" style={{ borderColor: "#00d9ff", backgroundColor: "#00d9ff" }} />
                  <span class="text-xs font-mono text-[#aaa]">#00d9ff Cyan</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 border-2" style={{ borderColor: "#00ff88", backgroundColor: "#00ff88" }} />
                  <span class="text-xs font-mono text-[#aaa]">#00ff88 Green</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 border-2" style={{ borderColor: "#ffb000", backgroundColor: "#ffb000" }} />
                  <span class="text-xs font-mono text-[#aaa]">#ffb000 Amber</span>
                </div>
              </div>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-3">
              <h3 class="text-sm font-mono font-semibold text-[#aaa]">Typography</h3>
              <div class="space-y-2">
                <p class="text-xs font-mono text-[#666]">Font: Monospace</p>
                <p class="text-lg font-mono text-[#00d9ff]">Title (18px)</p>
                <p class="text-sm font-mono text-[#888]">Body (14px)</p>
                <p class="text-xs font-mono text-[#666]">Caption (12px)</p>
              </div>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-3">
              <h3 class="text-sm font-mono font-semibold text-[#aaa]">Spacing</h3>
              <div class="space-y-2">
                <p class="text-xs font-mono text-[#666]">Sharp corners (0px)</p>
                <p class="text-xs font-mono text-[#666]">Border width: 1-2px</p>
                <p class="text-xs font-mono text-[#666]">Padding: 16-32px</p>
                <p class="text-xs font-mono text-[#666]">Gap: 8-16px</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer class="text-center text-xs font-mono text-[#666] pt-8 border-t border-[#333]">
          <p>Empty State Components • Phase 3 UI/UX Polish</p>
          <p class="mt-2">Based on 2026 UX research and accessibility best practices</p>
        </footer>
      </div>
    </div>
  );
}

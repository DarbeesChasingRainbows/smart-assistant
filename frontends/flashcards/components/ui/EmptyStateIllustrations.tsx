/** @jsxImportSource preact */

/**
 * Geometric SVG Illustrations for Empty States
 *
 * Design characteristics:
 * - Minimal line art with geometric patterns
 * - Sharp corners (no rounded paths)
 * - Stroke-based (minimal fills)
 * - Cyan accent color (#00d9ff) from Sci-Fi HUD theme
 * - 120px × 120px viewBox
 * - Circuit-like and tech grid patterns
 *
 * Based on 2026 illustration trends:
 * - Minimal line illustrations for B2B/SaaS/fintech
 * - Clean geometry with balanced stroke weights
 * - Abstract geometric patterns for technical systems
 *
 * Accessibility:
 * - aria-hidden="true" (decorative only)
 * - Semantic meaning conveyed by adjacent text
 */

export interface EmptyStateIllustrationProps {
  type: "no-decks" | "no-cards" | "all-done" | "no-results";
  class?: string;
}

/**
 * No Decks Illustration
 * Geometric stack/folder icon with circuit-like patterns
 */
function NoDecksIllustration({ class: className }: { class?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      aria-hidden="true"
    >
      {/* Circuit background grid */}
      <line x1="20" y1="30" x2="100" y2="30" stroke="#333" stroke-width="1" />
      <line x1="20" y1="60" x2="100" y2="60" stroke="#333" stroke-width="1" />
      <line x1="20" y1="90" x2="100" y2="90" stroke="#333" stroke-width="1" />
      <line x1="30" y1="20" x2="30" y2="100" stroke="#333" stroke-width="1" />
      <line x1="60" y1="20" x2="60" y2="100" stroke="#333" stroke-width="1" />
      <line x1="90" y1="20" x2="90" y2="100" stroke="#333" stroke-width="1" />

      {/* Stack of empty folders */}
      <rect x="25" y="45" width="60" height="40" stroke="#00d9ff" stroke-width="2" fill="#1a1a1a" />
      <rect x="30" y="40" width="60" height="40" stroke="#00d9ff" stroke-width="2" fill="#1a1a1a" />
      <rect x="35" y="35" width="60" height="40" stroke="#00d9ff" stroke-width="2.5" fill="#1a1a1a" />

      {/* Tab indicators */}
      <line x1="35" y1="35" x2="50" y2="35" stroke="#00d9ff" stroke-width="2.5" />
      <line x1="50" y1="35" x2="50" y2="30" stroke="#00d9ff" stroke-width="2.5" />
      <line x1="50" y1="30" x2="65" y2="30" stroke="#00d9ff" stroke-width="2.5" />
      <line x1="65" y1="30" x2="65" y2="35" stroke="#00d9ff" stroke-width="2.5" />

      {/* Circuit connection nodes */}
      <circle cx="30" cy="30" r="2" fill="#00d9ff" />
      <circle cx="90" cy="30" r="2" fill="#00d9ff" />
      <circle cx="30" cy="90" r="2" fill="#00d9ff" />
      <circle cx="90" cy="90" r="2" fill="#00d9ff" />
    </svg>
  );
}

/**
 * No Cards Illustration
 * Empty card outline with tech grid pattern
 */
function NoCardsIllustration({ class: className }: { class?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      aria-hidden="true"
    >
      {/* Tech grid pattern */}
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#333" stroke-width="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="120" height="120" fill="url(#grid)" />

      {/* Empty card outline */}
      <rect x="20" y="30" width="80" height="60" stroke="#00d9ff" stroke-width="2.5" fill="#0a0a0a" />

      {/* Card header line */}
      <line x1="20" y1="45" x2="100" y2="45" stroke="#00d9ff" stroke-width="2" />

      {/* Empty content lines (dashed) */}
      <line x1="30" y1="55" x2="90" y2="55" stroke="#555" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="30" y1="65" x2="90" y2="65" stroke="#555" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="30" y1="75" x2="70" y2="75" stroke="#555" stroke-width="1" stroke-dasharray="4 4" />

      {/* Corner brackets */}
      <polyline points="20,35 20,30 25,30" stroke="#00d9ff" stroke-width="2" />
      <polyline points="95,30 100,30 100,35" stroke="#00d9ff" stroke-width="2" />
      <polyline points="100,85 100,90 95,90" stroke="#00d9ff" stroke-width="2" />
      <polyline points="25,90 20,90 20,85" stroke="#00d9ff" stroke-width="2" />

      {/* Circuit nodes */}
      <circle cx="60" cy="60" r="3" stroke="#00d9ff" stroke-width="1.5" fill="#0a0a0a" />
    </svg>
  );
}

/**
 * All Done Illustration
 * Checkmark/trophy with geometric rays
 */
function AllDoneIllustration({ class: className }: { class?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      aria-hidden="true"
    >
      {/* Geometric rays */}
      <line x1="60" y1="15" x2="60" y2="25" stroke="#00ff88" stroke-width="2" />
      <line x1="85" y1="20" x2="80" y2="28" stroke="#00ff88" stroke-width="2" />
      <line x1="100" y1="40" x2="92" y2="45" stroke="#00ff88" stroke-width="2" />
      <line x1="105" y1="60" x2="95" y2="60" stroke="#00ff88" stroke-width="2" />
      <line x1="35" y1="20" x2="40" y2="28" stroke="#00ff88" stroke-width="2" />
      <line x1="20" y1="40" x2="28" y2="45" stroke="#00ff88" stroke-width="2" />
      <line x1="15" y1="60" x2="25" y2="60" stroke="#00ff88" stroke-width="2" />

      {/* Trophy/shield base */}
      <polygon
        points="40,50 80,50 75,85 45,85"
        stroke="#00ff88"
        stroke-width="2.5"
        fill="#001a0f"
      />

      {/* Trophy cup */}
      <rect x="50" y="40" width="20" height="10" stroke="#00ff88" stroke-width="2.5" fill="#001a0f" />

      {/* Handle left */}
      <path d="M 45 43 L 40 43 L 40 47 L 45 47" stroke="#00ff88" stroke-width="2" fill="none" />

      {/* Handle right */}
      <path d="M 75 43 L 80 43 L 80 47 L 75 47" stroke="#00ff88" stroke-width="2" fill="none" />

      {/* Base stand */}
      <rect x="35" y="85" width="50" height="5" stroke="#00ff88" stroke-width="2.5" fill="#001a0f" />
      <rect x="40" y="90" width="40" height="3" stroke="#00ff88" stroke-width="2" fill="#00ff88" />

      {/* Checkmark inside */}
      <polyline
        points="52,65 57,72 68,58"
        stroke="#00ff88"
        stroke-width="3"
        fill="none"
        stroke-linecap="square"
      />

      {/* Corner accents */}
      <line x1="45" y1="50" x2="45" y2="55" stroke="#00d9ff" stroke-width="1.5" />
      <line x1="75" y1="50" x2="75" y2="55" stroke="#00d9ff" stroke-width="1.5" />
    </svg>
  );
}

/**
 * No Results Illustration
 * Magnifying glass with empty circle
 */
function NoResultsIllustration({ class: className }: { class?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class={className}
      aria-hidden="true"
    >
      {/* Grid background */}
      <line x1="30" y1="30" x2="90" y2="30" stroke="#333" stroke-width="1" />
      <line x1="30" y1="50" x2="90" y2="50" stroke="#333" stroke-width="1" />
      <line x1="30" y1="70" x2="90" y2="70" stroke="#333" stroke-width="1" />
      <line x1="30" y1="90" x2="90" y2="90" stroke="#333" stroke-width="1" />
      <line x1="30" y1="30" x2="30" y2="90" stroke="#333" stroke-width="1" />
      <line x1="50" y1="30" x2="50" y2="90" stroke="#333" stroke-width="1" />
      <line x1="70" y1="30" x2="70" y2="90" stroke="#333" stroke-width="1" />
      <line x1="90" y1="30" x2="90" y2="90" stroke="#333" stroke-width="1" />

      {/* Magnifying glass lens */}
      <circle cx="50" cy="50" r="25" stroke="#00d9ff" stroke-width="2.5" fill="#0a0a0a" />
      <circle cx="50" cy="50" r="20" stroke="#00d9ff" stroke-width="1.5" fill="none" />

      {/* Handle */}
      <line x1="68" y1="68" x2="85" y2="85" stroke="#00d9ff" stroke-width="3" stroke-linecap="square" />
      <line x1="85" y1="85" x2="90" y2="90" stroke="#00d9ff" stroke-width="4" stroke-linecap="square" />

      {/* Empty indicator - X mark inside lens */}
      <line x1="42" y1="42" x2="58" y2="58" stroke="#888" stroke-width="2" />
      <line x1="58" y1="42" x2="42" y2="58" stroke="#888" stroke-width="2" />

      {/* Corner brackets */}
      <polyline points="25,30 25,25 30,25" stroke="#00d9ff" stroke-width="1.5" />
      <polyline points="90,25 95,25 95,30" stroke="#00d9ff" stroke-width="1.5" />
      <polyline points="95,90 95,95 90,95" stroke="#00d9ff" stroke-width="1.5" />
      <polyline points="30,95 25,95 25,90" stroke="#00d9ff" stroke-width="1.5" />
    </svg>
  );
}

/**
 * Main illustration component with type selector
 */
export default function EmptyStateIllustration({
  type,
  class: className,
}: EmptyStateIllustrationProps) {
  const baseClasses = "w-[120px] h-[120px]";
  const classes = className ? `${baseClasses} ${className}` : baseClasses;

  switch (type) {
    case "no-decks":
      return <NoDecksIllustration class={classes} />;
    case "no-cards":
      return <NoCardsIllustration class={classes} />;
    case "all-done":
      return <AllDoneIllustration class={classes} />;
    case "no-results":
      return <NoResultsIllustration class={classes} />;
    default:
      return null;
  }
}

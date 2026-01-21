/** @jsxImportSource preact */

/**
 * KeyboardHint component - Visual indicator for keyboard shortcuts
 *
 * Sci-Fi HUD Design:
 * - Dark background with cyan border
 * - Monospace font for technical feel
 * - Sharp corners (no border-radius)
 * - Subtle, non-intrusive styling
 *
 * Accessibility:
 * - Visible text (never icon-only)
 * - High contrast colors
 * - aria-label for screen readers
 *
 * @example
 * <button>
 *   Create New Card
 *   <KeyboardHint shortcut="N" position="inline" />
 * </button>
 */

export interface KeyboardHintProps {
  /** The keyboard shortcut to display (e.g., "N", "Ctrl+S", "Space") */
  shortcut: string;

  /** Position of the hint */
  position?: "top-right" | "bottom-right" | "inline";

  /** Additional CSS classes */
  class?: string;
}

const positionStyles = {
  "top-right": "absolute top-2 right-2",
  "bottom-right": "absolute bottom-2 right-2",
  "inline": "inline-block ml-2",
};

export default function KeyboardHint({
  shortcut,
  position = "inline",
  class: className,
}: KeyboardHintProps) {
  return (
    <kbd
      class={`
        ${positionStyles[position]}
        px-2
        py-0.5
        text-xs
        font-mono
        font-semibold
        bg-[#0a0a0a]
        text-[#00d9ff]
        border
        border-[#00d9ff]
        ${className || ""}
      `}
      style="border-radius: 0;"
      aria-label={`Keyboard shortcut: ${shortcut}`}
    >
      {shortcut}
    </kbd>
  );
}

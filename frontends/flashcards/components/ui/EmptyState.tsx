/** @jsxImportSource preact */
import EmptyStateIllustration from "./EmptyStateIllustrations.tsx";

/**
 * Empty State Component with Sci-Fi HUD Styling
 *
 * Design characteristics:
 * - Centered layout with max-width 400px
 * - Monospace fonts for technical feel
 * - Sharp corners (border-radius: 0)
 * - Geometric SVG illustrations
 * - Variant-based styling (informational, action, celebratory)
 * - Maximum 2 CTAs (Hick's Law compliance)
 *
 * Microcopy best practices (Shopify 2026, UX Writing Hub):
 * - Positive language and conversational tone
 * - Start CTAs with action verbs
 * - Include useful info and actionable CTAs
 *
 * Accessibility (Kid Test + Fitts's Law):
 * - Semantic HTML (<section>, <h2>, <p>)
 * - role="status" for dynamic empty states
 * - aria-live="polite" if content changes
 * - All buttons meet 44px minimum touch targets
 * - Icons paired with visible text labels
 * - SVG illustrations are decorative (aria-hidden)
 *
 * @example
 * ```tsx
 * <EmptyState
 *   variant="action"
 *   title="No Decks Yet"
 *   description="Create your first deck to start learning with spaced repetition"
 *   illustration="no-decks"
 *   primaryAction={{
 *     label: "Create Deck",
 *     onClick: () => navigateTo('/decks/new')
 *   }}
 * />
 * ```
 */

export interface EmptyStateAction {
  /** Button label - must be visible text (Kid Test) */
  label: string;
  /** Click handler */
  onClick: () => void;
}

export interface EmptyStateProps {
  /**
   * Visual variant affects styling and semantics
   * - informational: Neutral, no immediate action required
   * - action: Requires user action to proceed
   * - celebratory: Positive achievement state
   */
  variant: "informational" | "action" | "celebratory";

  /** Title text - appears in cyan for action/info, green for celebratory */
  title: string;

  /** Description text - provides context and guidance */
  description: string;

  /**
   * Predefined illustration type
   * Use "custom" with customSvg for non-standard illustrations
   */
  illustration?: "no-decks" | "no-cards" | "all-done" | "no-results" | "custom";

  /** Custom SVG markup (only used when illustration="custom") */
  customSvg?: string;

  /** Primary call-to-action button (required for action variant) */
  primaryAction?: EmptyStateAction;

  /** Optional secondary action (max 2 CTAs per Hick's Law) */
  secondaryAction?: EmptyStateAction;

  /**
   * Whether this is a dynamic empty state that changes
   * (e.g., search results, loading → empty)
   * Sets aria-live="polite" for screen reader announcements
   */
  isDynamic?: boolean;

  /** Additional CSS classes for container */
  class?: string;
}

const variantConfig = {
  informational: {
    titleColor: "#00d9ff",
    borderColor: "#333",
    bgColor: "transparent",
  },
  action: {
    titleColor: "#00d9ff",
    borderColor: "#00d9ff",
    bgColor: "#0a0a0a",
  },
  celebratory: {
    titleColor: "#00ff88",
    borderColor: "#00ff88",
    bgColor: "#001a0f",
  },
};

export default function EmptyState({
  variant,
  title,
  description,
  illustration,
  customSvg,
  primaryAction,
  secondaryAction,
  isDynamic = false,
  class: className,
}: EmptyStateProps) {
  const config = variantConfig[variant];

  // Validate action variant has primary action
  if (variant === "action" && !primaryAction) {
    console.warn(
      'EmptyState: variant="action" should have a primaryAction defined'
    );
  }

  return (
    <section
      role={isDynamic ? "status" : undefined}
      aria-live={isDynamic ? "polite" : undefined}
      class={`empty-state flex flex-col items-center justify-center px-6 py-12 ${
        className || ""
      }`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      {/* Container with max-width */}
      <div class="flex flex-col items-center text-center max-w-[400px] space-y-6">
        {/* Illustration */}
        {illustration && illustration !== "custom" && (
          <div class="mb-2">
            <EmptyStateIllustration type={illustration} />
          </div>
        )}

        {/* Custom SVG */}
        {illustration === "custom" && customSvg && (
          <div
            class="mb-2 w-[120px] h-[120px]"
            dangerouslySetInnerHTML={{ __html: customSvg }}
            aria-hidden="true"
          />
        )}

        {/* Title */}
        <h2
          class="text-lg font-mono font-semibold leading-tight"
          style={{ color: config.titleColor }}
        >
          {title}
        </h2>

        {/* Description */}
        <p class="text-sm text-[#888] font-mono leading-relaxed">
          {description}
        </p>

        {/* Actions (max 2 per Hick's Law) */}
        {(primaryAction || secondaryAction) && (
          <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                class="min-h-[44px] min-w-[120px] px-6 py-3 font-mono text-sm font-medium border-2 transition-colors hover:bg-white/10"
                style={{
                  borderColor: config.titleColor,
                  color: config.titleColor,
                  borderRadius: "0",
                }}
              >
                {primaryAction.label}
              </button>
            )}

            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                class="min-h-[44px] min-w-[120px] px-6 py-3 font-mono text-sm font-medium border-2 border-[#555] text-[#aaa] transition-colors hover:bg-white/10 hover:border-[#888] hover:text-[#ddd]"
                style={{ borderRadius: "0" }}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Optional border for contained variants */}
      {variant !== "informational" && (
        <style>
          {`
            .empty-state {
              border: 1px solid ${config.borderColor};
              border-radius: 0;
            }
          `}
        </style>
      )}
    </section>
  );
}

/**
 * Predefined empty state scenarios
 * These helper functions provide consistent microcopy and configuration
 */

/** No Decks scenario - user needs to create their first deck */
export function NoDecksEmptyState(props: {
  onCreateDeck: () => void;
  class?: string;
}) {
  return (
    <EmptyState
      variant="action"
      title="No Decks Yet"
      description="Create your first deck to start learning with spaced repetition"
      illustration="no-decks"
      primaryAction={{
        label: "Create Deck",
        onClick: props.onCreateDeck,
      }}
      class={props.class}
    />
  );
}

/** No Cards in Deck scenario - user needs to add cards */
export function NoCardsEmptyState(props: {
  onCreateCard: () => void;
  onImportCards?: () => void;
  class?: string;
}) {
  return (
    <EmptyState
      variant="action"
      title="No Flashcards"
      description="Add cards to this deck to begin your learning journey"
      illustration="no-cards"
      primaryAction={{
        label: "Create Card",
        onClick: props.onCreateCard,
      }}
      secondaryAction={
        props.onImportCards
          ? {
              label: "Import Cards",
              onClick: props.onImportCards,
            }
          : undefined
      }
      class={props.class}
    />
  );
}

/** All Cards Reviewed scenario - celebratory completion state */
export function AllDoneEmptyState(props: {
  onReviewAgain: () => void;
  onViewStats?: () => void;
  class?: string;
}) {
  return (
    <EmptyState
      variant="celebratory"
      title="All Done! 🎯"
      description="You've reviewed all due cards. Excellent work!"
      illustration="all-done"
      primaryAction={{
        label: "Review Again",
        onClick: props.onReviewAgain,
      }}
      secondaryAction={
        props.onViewStats
          ? {
              label: "View Stats",
              onClick: props.onViewStats,
            }
          : undefined
      }
      class={props.class}
    />
  );
}

/** Search No Results scenario - informational with action to clear */
export function NoResultsEmptyState(props: {
  onClearFilters: () => void;
  searchTerm?: string;
  class?: string;
}) {
  return (
    <EmptyState
      variant="informational"
      title="No Cards Found"
      description={
        props.searchTerm
          ? `No results for "${props.searchTerm}". Try different keywords or adjust your filters`
          : "Try different keywords or adjust your filters"
      }
      illustration="no-results"
      primaryAction={{
        label: "Clear Filters",
        onClick: props.onClearFilters,
      }}
      isDynamic
      class={props.class}
    />
  );
}

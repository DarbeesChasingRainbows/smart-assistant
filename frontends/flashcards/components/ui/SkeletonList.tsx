/** @jsxImportSource preact */
import Skeleton from "./Skeleton.tsx";

/**
 * SkeletonList component - Loading placeholder for list items
 *
 * Displays multiple skeleton rows that mimic list item structure:
 * - Optional leading icon/avatar
 * - Primary text line
 * - Optional secondary text line
 * - Optional trailing action
 *
 * @example
 * <SkeletonList rows={5} />
 *
 * @example
 * <SkeletonList
 *   rows={3}
 *   showAvatar={true}
 *   showSecondaryText={true}
 *   showAction={true}
 *   animation="pulse"
 * />
 */

export interface SkeletonListProps {
  /** Number of list items to display */
  rows?: number;

  /** Show leading circular avatar/icon */
  showAvatar?: boolean;

  /** Show secondary text line under primary */
  showSecondaryText?: boolean;

  /** Show trailing action skeleton */
  showAction?: boolean;

  /** Add dividers between items */
  showDividers?: boolean;

  /** Animation style */
  animation?: "shimmer" | "pulse" | "none";

  /** Additional CSS classes */
  class?: string;
}

export default function SkeletonList({
  rows = 3,
  showAvatar = false,
  showSecondaryText = false,
  showAction = false,
  showDividers = true,
  animation = "shimmer",
  class: className,
}: SkeletonListProps) {
  // Varied widths for primary text to look natural
  const primaryWidths = ["90%", "80%", "95%", "85%", "88%"];
  const secondaryWidths = ["70%", "65%", "75%", "68%", "72%"];

  return (
    <div
      class={className || ""}
      aria-busy="true"
      aria-label="Loading list..."
      role="status"
    >
      {Array.from({ length: rows }).map((_, index) => {
        const primaryWidth = primaryWidths[index % primaryWidths.length];
        const secondaryWidth = secondaryWidths[index % secondaryWidths.length];

        return (
          <div key={index}>
            <div class="flex items-center gap-4 py-4">
              {/* Leading avatar/icon */}
              {showAvatar && (
                <Skeleton
                  variant="circular"
                  width="44px"
                  height="44px"
                  animation={animation}
                />
              )}

              {/* Text content */}
              <div class="flex-1">
                {/* Primary text */}
                <Skeleton
                  variant="text"
                  width={primaryWidth}
                  height="18px"
                  animation={animation}
                />

                {/* Secondary text */}
                {showSecondaryText && (
                  <div class="mt-2">
                    <Skeleton
                      variant="text"
                      width={secondaryWidth}
                      height="14px"
                      animation={animation}
                    />
                  </div>
                )}
              </div>

              {/* Trailing action */}
              {showAction && (
                <Skeleton
                  variant="rectangular"
                  width="44px"
                  height="44px"
                  animation={animation}
                />
              )}
            </div>

            {/* Divider between items */}
            {showDividers && index < rows - 1 && (
              <div class="border-b border-[#333]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

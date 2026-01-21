/** @jsxImportSource preact */
import Skeleton from "./Skeleton.tsx";

/**
 * SkeletonCard component - Loading placeholder for Card components
 *
 * Mimics the structure of the Card component with:
 * - Optional header area (title + actions)
 * - Content area with multiple skeleton lines
 * - Sci-Fi HUD borders and styling
 *
 * @example
 * <SkeletonCard />
 *
 * @example
 * <SkeletonCard
 *   showHeader={true}
 *   showActions={true}
 *   lines={3}
 *   variant="accent"
 * />
 */

export interface SkeletonCardProps {
  /** Show header section with title skeleton */
  showHeader?: boolean;

  /** Show header action skeletons */
  showActions?: boolean;

  /** Number of content lines to display */
  lines?: number;

  /** Visual variant matching Card variants */
  variant?: "default" | "accent" | "success" | "warning" | "error";

  /** Animation style */
  animation?: "shimmer" | "pulse" | "none";

  /** Additional CSS classes */
  class?: string;
}

const variantBorderStyles = {
  default: "border-[#333]",
  accent: "border-[#00d9ff]",
  success: "border-[#00ff88]",
  warning: "border-[#ffb000]",
  error: "border-[#ff4444]",
};

export default function SkeletonCard({
  showHeader = true,
  showActions = false,
  lines = 3,
  variant = "default",
  animation = "shimmer",
  class: className,
}: SkeletonCardProps) {
  return (
    <div
      class={`border ${variantBorderStyles[variant]} bg-[#0a0a0a] ${className || ""}`}
      style="border-radius: 0;"
      aria-busy="true"
      aria-label="Loading card..."
      role="status"
    >
      {showHeader && (
        <div class="px-6 py-4 border-b border-[#333] flex items-start justify-between gap-4">
          <div class="flex-1">
            {/* Title skeleton */}
            <Skeleton
              variant="text"
              width="60%"
              height="24px"
              animation={animation}
            />
            {/* Subtitle skeleton */}
            <div class="mt-2">
              <Skeleton
                variant="text"
                width="40%"
                height="14px"
                animation={animation}
              />
            </div>
          </div>
          {showActions && (
            <div class="flex items-center gap-2">
              {/* Action button skeletons */}
              <Skeleton
                variant="rectangular"
                width="44px"
                height="44px"
                animation={animation}
              />
              <Skeleton
                variant="rectangular"
                width="44px"
                height="44px"
                animation={animation}
              />
            </div>
          )}
        </div>
      )}

      <div class="p-6">
        {/* Content lines with varying widths for natural appearance */}
        {Array.from({ length: lines }).map((_, index) => {
          // Vary the width: 90%, 95%, 80%, 90%, etc.
          const widths = ["90%", "95%", "80%", "90%", "85%"];
          const width = widths[index % widths.length];
          // Last line is shorter
          const finalWidth = index === lines - 1 ? "70%" : width;

          return (
            <div key={index} class={index > 0 ? "mt-4" : ""}>
              <Skeleton
                variant="text"
                width={finalWidth}
                height="16px"
                animation={animation}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

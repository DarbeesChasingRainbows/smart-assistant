/** @jsxImportSource preact */

/**
 * Skeleton component - Base loading placeholder
 *
 * Design characteristics:
 * - Sci-Fi HUD dark theme with shimmer animation
 * - Sharp corners (no border-radius)
 * - Animated gradients moving left-to-right
 * - Respects prefers-reduced-motion
 * - Multiple animation variants
 *
 * @example
 * <Skeleton variant="text" width="200px" height="20px" />
 *
 * @example
 * <Skeleton
 *   variant="rectangular"
 *   width={300}
 *   height={100}
 *   animation="pulse"
 * />
 */

export interface SkeletonProps {
  /** Visual variant determining shape */
  variant?: "text" | "circular" | "rectangular" | "card";

  /** Width in pixels or CSS string */
  width?: string | number;

  /** Height in pixels or CSS string */
  height?: string | number;

  /** Animation style */
  animation?: "shimmer" | "pulse" | "none";

  /** Additional CSS classes */
  class?: string;
}

const variantStyles = {
  text: "h-4",
  circular: "rounded-full",
  rectangular: "",
  card: "min-h-[200px]",
};

const defaultSizes = {
  text: { width: "100%", height: "16px" },
  circular: { width: "40px", height: "40px" },
  rectangular: { width: "100%", height: "100px" },
  card: { width: "100%", height: "200px" },
};

export default function Skeleton({
  variant = "rectangular",
  width,
  height,
  animation = "shimmer",
  class: className,
}: SkeletonProps) {
  // Use provided dimensions or fallback to defaults
  const finalWidth = width ?? defaultSizes[variant].width;
  const finalHeight = height ?? defaultSizes[variant].height;

  // Convert numbers to px strings
  const widthStr = typeof finalWidth === "number" ? `${finalWidth}px` : finalWidth;
  const heightStr = typeof finalHeight === "number" ? `${finalHeight}px` : finalHeight;

  // Animation classes
  const animationClass = animation === "shimmer"
    ? "skeleton-shimmer"
    : animation === "pulse"
    ? "skeleton-pulse"
    : "";

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
          }

          .skeleton-shimmer {
            background: linear-gradient(
              90deg,
              #1a1a1a 0%,
              #2a2a2a 20%,
              #3a3a3a 40%,
              #2a2a2a 60%,
              #1a1a1a 100%
            );
            background-size: 1000px 100%;
            animation: shimmer 1.5s infinite linear;
          }

          .skeleton-pulse {
            background: #1a1a1a;
            animation: pulse 1.5s infinite ease-in-out;
          }

          .skeleton-static {
            background: #1a1a1a;
          }

          @media (prefers-reduced-motion: reduce) {
            .skeleton-shimmer,
            .skeleton-pulse {
              animation: none;
              background: #1a1a1a;
            }
          }
        `}
      </style>
      <div
        class={`${variantStyles[variant]} ${animationClass} ${className || ""}`}
        style={{
          width: widthStr,
          height: heightStr,
          borderRadius: variant === "circular" ? "50%" : "0",
        }}
        aria-busy="true"
        aria-label="Loading..."
        role="status"
      />
    </>
  );
}

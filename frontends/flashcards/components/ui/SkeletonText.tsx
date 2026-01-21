/** @jsxImportSource preact */
import Skeleton from "./Skeleton.tsx";

/**
 * SkeletonText component - Loading placeholder for text blocks
 *
 * Displays multiple skeleton lines that mimic paragraph text:
 * - Configurable number of lines
 * - Varied widths for natural appearance
 * - Last line is shorter (70-80% width)
 * - Customizable line height and spacing
 *
 * @example
 * <SkeletonText lines={4} />
 *
 * @example
 * <SkeletonText
 *   lines={6}
 *   lineHeight="20px"
 *   spacing="large"
 *   animation="pulse"
 * />
 */

export interface SkeletonTextProps {
  /** Number of text lines to display */
  lines?: number;

  /** Height of each line */
  lineHeight?: string | number;

  /** Spacing between lines */
  spacing?: "tight" | "normal" | "relaxed" | "large";

  /** Width of the text block (affects line widths) */
  width?: string | number;

  /** Animation style */
  animation?: "shimmer" | "pulse" | "none";

  /** Additional CSS classes */
  class?: string;
}

const spacingStyles = {
  tight: "mt-2",
  normal: "mt-3",
  relaxed: "mt-4",
  large: "mt-6",
};

export default function SkeletonText({
  lines = 3,
  lineHeight = "16px",
  spacing = "normal",
  width = "100%",
  animation = "shimmer",
  class: className,
}: SkeletonTextProps) {
  // Varied widths for natural paragraph appearance
  const lineWidths = ["95%", "90%", "98%", "92%", "94%", "88%", "96%"];

  return (
    <div
      class={className || ""}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
      }}
      aria-busy="true"
      aria-label="Loading text..."
      role="status"
    >
      {Array.from({ length: lines }).map((_, index) => {
        // Determine line width
        let lineWidth: string;
        if (index === lines - 1) {
          // Last line is shorter (70-80%)
          lineWidth = Math.random() > 0.5 ? "75%" : "70%";
        } else {
          lineWidth = lineWidths[index % lineWidths.length];
        }

        return (
          <div key={index} class={index > 0 ? spacingStyles[spacing] : ""}>
            <Skeleton
              variant="text"
              width={lineWidth}
              height={lineHeight}
              animation={animation}
            />
          </div>
        );
      })}
    </div>
  );
}

/** @jsxImportSource preact */

/**
 * Progress component - Progress bar/indicator with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Monospace font for percentage display
 * - Geometric, technical appearance
 * - Optional label and value display
 *
 * Accessibility:
 * - Uses proper ARIA role and attributes
 * - Visible percentage text (not just visual bar)
 * - Label always visible when provided
 *
 * @example
 * <Progress value={75} max={100} label="Study Progress" />
 *
 * @example
 * <Progress
 *   value={450}
 *   max={1000}
 *   label="Experience Points"
 *   variant="success"
 *   showValue
 * />
 */

export interface ProgressProps {
  /** Current value */
  value: number;

  /** Maximum value */
  max: number;

  /** Optional label */
  label?: string;

  /** Show numeric value alongside bar */
  showValue?: boolean;

  /** Show percentage */
  showPercentage?: boolean;

  /** Visual variant */
  variant?: "default" | "accent" | "success" | "warning" | "error";

  /** Size of the progress bar */
  size?: "small" | "medium" | "large";

  /** Additional CSS classes */
  class?: string;
}

const variantStyles = {
  default: {
    bg: "bg-[#1a1a1a]",
    fill: "bg-[#444]",
    border: "border-[#444]",
    text: "text-[#aaa]",
  },
  accent: {
    bg: "bg-[#001a1f]",
    fill: "bg-[#00d9ff]",
    border: "border-[#00d9ff]",
    text: "text-[#00d9ff]",
  },
  success: {
    bg: "bg-[#001a0f]",
    fill: "bg-[#00ff88]",
    border: "border-[#00ff88]",
    text: "text-[#00ff88]",
  },
  warning: {
    bg: "bg-[#1f1500]",
    fill: "bg-[#ffb000]",
    border: "border-[#ffb000]",
    text: "text-[#ffb000]",
  },
  error: {
    bg: "bg-[#1a0000]",
    fill: "bg-[#ff4444]",
    border: "border-[#ff4444]",
    text: "text-[#ff4444]",
  },
};

const sizeStyles = {
  small: "h-2",
  medium: "h-4",
  large: "h-6",
};

export default function Progress({
  value,
  max,
  label,
  showValue = false,
  showPercentage = true,
  variant = "accent",
  size = "medium",
  class: className,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const styles = variantStyles[variant];

  return (
    <div class={`space-y-2 ${className || ""}`}>
      {/* Label and Value */}
      {(label || showValue || showPercentage) && (
        <div class="flex items-center justify-between gap-4">
          {label && (
            <span class="text-sm text-[#ddd]">
              {label}
            </span>
          )}
          <div class="flex items-center gap-3">
            {showValue && (
              <span class={`text-sm font-mono ${styles.text}`}>
                {value} / {max}
              </span>
            )}
            {showPercentage && (
              <span class={`text-sm font-mono font-semibold ${styles.text}`}>
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div
        class={`
          w-full
          border
          ${styles.bg}
          ${styles.border}
          ${sizeStyles[size]}
          overflow-hidden
        `}
        style="border-radius: 0;"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || "Progress"}
      >
        <div
          class={`
            h-full
            ${styles.fill}
            transition-all
            duration-300
            ease-out
          `}
          style={`width: ${percentage}%; border-radius: 0;`}
        />
      </div>
    </div>
  );
}

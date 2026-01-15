/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

/**
 * Alert component - Error/success/info/warning messages with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Border treatment matching alert type
 * - Icon + text (never icon-only)
 * - Optional action button with 44px touch target
 *
 * Accessibility:
 * - Icons are accompanied by text labels
 * - High contrast color combinations
 * - Action buttons meet 44px minimum touch target
 * - Proper ARIA role for screen readers
 *
 * Replaces/enhances the existing ErrorAlert component.
 *
 * @example
 * <Alert variant="error" title="Connection Failed">
 *   Unable to reach the backend server. Please try again.
 * </Alert>
 *
 * @example
 * <Alert
 *   variant="success"
 *   title="Flashcard Created"
 *   onAction={() => console.log("View")}
 *   actionLabel="View Flashcard"
 * >
 *   Your flashcard has been added to the deck.
 * </Alert>
 */

export interface AlertProps {
  /** Alert type */
  variant: "error" | "warning" | "info" | "success";

  /** Alert title */
  title?: string;

  /** Alert message */
  children: ComponentChildren;

  /** Optional action button callback */
  onAction?: () => void;

  /** Action button label (required if onAction is provided) */
  actionLabel?: string;

  /** Optional dismiss button */
  onDismiss?: () => void;

  /** Additional CSS classes */
  class?: string;
}

const variantStyles = {
  error: {
    container: "bg-[#1a0000] border-[#ff4444] text-[#ff4444]",
    icon: "▲",
    title: "Error",
  },
  warning: {
    container: "bg-[#1f1500] border-[#ffb000] text-[#ffb000]",
    icon: "⚠",
    title: "Warning",
  },
  info: {
    container: "bg-[#0a0a1a] border-[#88aaff] text-[#88aaff]",
    icon: "ℹ",
    title: "Info",
  },
  success: {
    container: "bg-[#001a0f] border-[#00ff88] text-[#00ff88]",
    icon: "✓",
    title: "Success",
  },
};

export default function Alert({
  variant,
  title,
  children,
  onAction,
  actionLabel,
  onDismiss,
  class: className,
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      class={`
        border-2
        p-4
        flex
        items-start
        gap-4
        ${styles.container}
        ${className || ""}
      `}
      style="border-radius: 0;"
      role="alert"
      aria-live="polite"
    >
      {/* Icon with text label */}
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-2xl font-mono leading-none">
          {styles.icon}
        </span>
        <span class="text-sm font-mono font-semibold">
          {title || styles.title}
        </span>
      </div>

      {/* Message */}
      <div class="flex-1 text-sm text-[#ddd] pt-1">
        {children}
      </div>

      {/* Actions */}
      {(onAction || onDismiss) && (
        <div class="flex items-center gap-2 flex-shrink-0">
          {onAction && actionLabel && (
            <button
              type="button"
              class="min-h-[44px] px-4 py-2 border border-current hover:bg-white/10 transition-colors font-mono text-sm"
              onClick={onAction}
              style="border-radius: 0;"
            >
              {actionLabel}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 transition-colors text-[#888] hover:text-current"
              onClick={onDismiss}
              aria-label="Dismiss alert"
              style="border-radius: 0;"
            >
              <span class="text-xl font-mono">×</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

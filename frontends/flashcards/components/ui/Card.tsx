/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

/**
 * Card component - Container with consistent Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Dark background with sharp corners
 * - Border treatment instead of shadows
 * - Optional header section with title/actions
 * - Flexible padding options
 *
 * @example
 * <Card>
 *   <p>Card content here</p>
 * </Card>
 *
 * @example
 * <Card
 *   title="System Status"
 *   variant="accent"
 *   padding="none"
 * >
 *   <CustomContent />
 * </Card>
 */

export interface CardProps {
  /** Card content */
  children: ComponentChildren;

  /** Optional title displayed in header */
  title?: string;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Actions to display in header (e.g., buttons) */
  headerActions?: ComponentChildren;

  /** Visual variant */
  variant?: "default" | "accent" | "success" | "warning" | "error";

  /** Padding size */
  padding?: "none" | "small" | "medium" | "large";

  /** Additional CSS classes */
  class?: string;
}

const variantStyles = {
  default: "bg-[#0a0a0a] border-[#333]",
  accent: "bg-[#0a0a0a] border-[#00d9ff]",
  success: "bg-[#0a0a0a] border-[#00ff88]",
  warning: "bg-[#0a0a0a] border-[#ffb000]",
  error: "bg-[#0a0a0a] border-[#ff4444]",
};

const paddingStyles = {
  none: "",
  small: "p-4",
  medium: "p-6",
  large: "p-8",
};

export default function Card({
  children,
  title,
  subtitle,
  headerActions,
  variant = "default",
  padding = "medium",
  class: className,
}: CardProps) {
  const hasHeader = title || subtitle || headerActions;

  return (
    <div
      class={`border ${variantStyles[variant]} ${className || ""}`}
      style="border-radius: 0;"
    >
      {hasHeader && (
        <div class="px-6 py-4 border-b border-[#333] flex items-start justify-between gap-4">
          <div class="flex-1">
            {title && (
              <h3 class="text-lg font-semibold text-[#00d9ff] font-mono">
                {title}
              </h3>
            )}
            {subtitle && (
              <p class="text-sm text-[#888] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div class="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      <div class={paddingStyles[padding]}>
        {children}
      </div>
    </div>
  );
}

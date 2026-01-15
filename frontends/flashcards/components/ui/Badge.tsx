/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

/**
 * Badge component - Status/tag indicator with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Monospace font for technical feel
 * - High contrast colors
 * - Minimal padding
 *
 * Accessibility:
 * - Text is always visible (no icon-only badges)
 * - High contrast color combinations
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending Review</Badge>
 * <Badge size="small">v2.1.0</Badge>
 */

export interface BadgeProps {
  /** Badge content (must be text) */
  children: ComponentChildren;

  /** Visual variant for different statuses */
  variant?: "default" | "accent" | "success" | "warning" | "error" | "info";

  /** Size of the badge */
  size?: "small" | "medium" | "large";

  /** Additional CSS classes */
  class?: string;
}

const variantStyles = {
  default: "bg-[#1a1a1a] text-[#aaa] border-[#444]",
  accent: "bg-[#001a1f] text-[#00d9ff] border-[#00d9ff]",
  success: "bg-[#001a0f] text-[#00ff88] border-[#00ff88]",
  warning: "bg-[#1f1500] text-[#ffb000] border-[#ffb000]",
  error: "bg-[#1a0000] text-[#ff4444] border-[#ff4444]",
  info: "bg-[#0a0a1a] text-[#88aaff] border-[#88aaff]",
};

const sizeStyles = {
  small: "px-2 py-1 text-xs",
  medium: "px-3 py-1.5 text-sm",
  large: "px-4 py-2 text-base",
};

export default function Badge({
  children,
  variant = "default",
  size = "medium",
  class: className,
}: BadgeProps) {
  return (
    <span
      class={`
        inline-block
        border
        font-mono
        font-semibold
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className || ""}
      `}
      style="border-radius: 0;"
    >
      {children}
    </span>
  );
}

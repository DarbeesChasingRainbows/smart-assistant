/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

/**
 * Modal component - Standardized modal wrapper with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Dark background with sharp corners
 * - Border treatment with accent color options
 * - Fixed positioning with backdrop
 * - Header, body, and footer sections
 *
 * Accessibility:
 * - Backdrop is clickable to close (unless disabled)
 * - Close button has visible text (not icon-only)
 * - Minimum 44px touch targets for all interactive elements
 * - Escape key handling (when preventClose is false)
 *
 * Based on budget frontend modal pattern but adapted for Sci-Fi HUD theme.
 *
 * @example
 * <Modal
 *   open={isOpen.value}
 *   onClose={() => isOpen.value = false}
 *   title="Create Flashcard"
 *   subtitle="Add a new flashcard to your deck"
 * >
 *   <form>
 *     <FormInput label="Question" />
 *     <FormInput label="Answer" />
 *   </form>
 * </Modal>
 */

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;

  /** Callback when modal should close */
  onClose: () => void;

  /** Modal title */
  title?: string;

  /** Modal subtitle/description */
  subtitle?: string;

  /** Modal content */
  children: ComponentChildren;

  /** Footer actions (e.g., Cancel/Submit buttons) */
  footer?: ComponentChildren;

  /** Prevent closing via backdrop/escape (for loading states) */
  preventClose?: boolean;

  /** Visual variant for border color */
  variant?: "default" | "accent" | "success" | "warning" | "error";

  /** Maximum width */
  maxWidth?: "small" | "medium" | "large" | "full";

  /** Additional CSS classes */
  class?: string;
}

const variantBorderStyles = {
  default: "border-[#444]",
  accent: "border-[#00d9ff]",
  success: "border-[#00ff88]",
  warning: "border-[#ffb000]",
  error: "border-[#ff4444]",
};

const maxWidthStyles = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-2xl",
  full: "max-w-full",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  preventClose = false,
  variant = "accent",
  maxWidth = "medium",
  class: className,
}: ModalProps) {
  if (!open) return null;

  const handleBackdropClick = () => {
    if (!preventClose) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !preventClose) {
      onClose();
    }
  };

  // Add escape key listener
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", handleEscapeKey);
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0, 0, 0, 0.8);"
    >
      {/* Backdrop */}
      <button
        type="button"
        class="absolute inset-0 cursor-default"
        onClick={handleBackdropClick}
        aria-label="Close modal"
        disabled={preventClose}
        tabIndex={-1}
      />

      {/* Modal Container */}
      <div
        class={`
          relative
          w-full
          ${maxWidthStyles[maxWidth]}
          bg-[#0a0a0a]
          border-2
          ${variantBorderStyles[variant]}
          ${className || ""}
        `}
        style="border-radius: 0;"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div class="px-6 py-4 border-b border-[#333] flex items-start justify-between gap-4">
            <div class="flex-1">
              {title && (
                <h2
                  id="modal-title"
                  class="text-lg font-semibold text-[#00d9ff] font-mono"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p class="text-sm text-[#888] mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {!preventClose && (
              <button
                type="button"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-[#00d9ff] transition-colors"
                onClick={onClose}
                aria-label="Close modal"
              >
                <span class="text-xl font-mono">×</span>
                <span class="ml-1 text-sm">Close</span>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div class="px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div class="px-6 py-4 border-t border-[#333] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

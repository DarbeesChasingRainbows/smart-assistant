/** @jsxImportSource preact */
import { type ComponentChildren } from "preact";
import { useSignal, useComputed } from "@preact/signals";
import { useRef, useEffect } from "preact/hooks";

/**
 * Accessible Tooltip component with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (border-radius: 0)
 * - Dark background with cyan border
 * - Monospace font for technical feel
 * - Smart positioning with viewport edge detection
 * - Subtle glow effect
 *
 * Accessibility (WCAG & ARIA Best Practices):
 * - role="tooltip" on tooltip element
 * - aria-describedby on trigger element (NOT on tooltip)
 * - Tooltip appears on focus or hover without additional interaction
 * - Tooltip disappears on blur or mouse leave automatically
 * - Tooltip never receives focus (focus stays on trigger)
 * - No interactive elements inside tooltips
 * - Escape key closes tooltip
 * - Triggering element must be keyboard focusable
 *
 * Research sources:
 * - W3C Tooltip Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 * - MDN ARIA tooltip: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role
 * - The A11Y Collective: https://www.a11y-collective.com/blog/tooltips-in-web-accessibility/
 *
 * @example
 * <Tooltip content="Edit this flashcard" position="top">
 *   <button>
 *     <svg>...</svg>
 *     Edit
 *   </button>
 * </Tooltip>
 */

export interface TooltipProps {
  /** Tooltip text content (must be plain text, no interactive elements) */
  content: string;

  /** Preferred position relative to trigger */
  position?: "top" | "bottom" | "left" | "right" | "auto";

  /** Delay before showing on hover in milliseconds (default: 500ms, focus shows immediately) */
  delay?: number;

  /** The trigger element */
  children: ComponentChildren;

  /** Additional CSS classes for the trigger wrapper */
  class?: string;
}

type Position = "top" | "bottom" | "left" | "right";

interface PositionCoords {
  top: number;
  left: number;
  finalPosition: Position;
}

// Generate unique ID for aria-describedby
let tooltipIdCounter = 0;
const generateTooltipId = () => `tooltip-${++tooltipIdCounter}`;

export default function Tooltip({
  content,
  position = "top",
  delay = 500,
  children,
  class: className,
}: TooltipProps) {
  const isVisible = useSignal(false);
  const tooltipId = useRef(generateTooltipId());
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);
  const isHoveringTooltip = useSignal(false);
  const tooltipPosition = useSignal<PositionCoords>({ top: 0, left: 0, finalPosition: "top" });

  // Clear hover timeout
  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current !== null) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Calculate tooltip position with viewport edge detection
  const calculatePosition = (): PositionCoords => {
    if (!triggerRef.current || !tooltipRef.current) {
      return { top: 0, left: 0, finalPosition: "top" };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const offset = 8; // Distance from trigger
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let finalPosition: Position = position === "auto" ? "top" : position;
    let top = 0;
    let left = 0;

    // Calculate position based on preference
    const positions: Record<Position, () => { top: number; left: number; fits: boolean }> = {
      top: () => ({
        top: triggerRect.top - tooltipRect.height - offset,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        fits: triggerRect.top - tooltipRect.height - offset >= 0,
      }),
      bottom: () => ({
        top: triggerRect.bottom + offset,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
        fits: triggerRect.bottom + tooltipRect.height + offset <= viewport.height,
      }),
      left: () => ({
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.left - tooltipRect.width - offset,
        fits: triggerRect.left - tooltipRect.width - offset >= 0,
      }),
      right: () => ({
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.right + offset,
        fits: triggerRect.right + tooltipRect.width + offset <= viewport.width,
      }),
    };

    // Try preferred position first
    let calc = positions[finalPosition]();

    // If auto positioning or doesn't fit, try other positions
    if (position === "auto" || !calc.fits) {
      const positionOrder: Position[] = ["top", "bottom", "right", "left"];
      for (const pos of positionOrder) {
        calc = positions[pos]();
        if (calc.fits) {
          finalPosition = pos;
          break;
        }
      }
    }

    top = calc.top;
    left = calc.left;

    // Ensure tooltip stays within viewport horizontally
    if (left < 0) {
      left = offset;
    } else if (left + tooltipRect.width > viewport.width) {
      left = viewport.width - tooltipRect.width - offset;
    }

    // Ensure tooltip stays within viewport vertically
    if (top < 0) {
      top = offset;
    } else if (top + tooltipRect.height > viewport.height) {
      top = viewport.height - tooltipRect.height - offset;
    }

    return { top, left, finalPosition };
  };

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible.value && triggerRef.current && tooltipRef.current) {
      tooltipPosition.value = calculatePosition();
    }
  }, [isVisible.value]);

  // Show tooltip immediately (for keyboard focus)
  const showTooltipImmediate = () => {
    clearHoverTimeout();
    isVisible.value = true;
  };

  // Show tooltip with delay (for mouse hover)
  const showTooltipDelayed = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = window.setTimeout(() => {
      isVisible.value = true;
    }, delay);
  };

  // Hide tooltip
  const hideTooltip = () => {
    clearHoverTimeout();
    // Don't hide if hovering over tooltip itself
    if (!isHoveringTooltip.value) {
      isVisible.value = false;
    }
  };

  // Handle Escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      isVisible.value = false;
    }
  };

  // Handle mouse enter on trigger
  const handleTriggerMouseEnter = () => {
    showTooltipDelayed();
  };

  // Handle mouse leave from trigger
  const handleTriggerMouseLeave = () => {
    // Add small delay to allow mouse to move to tooltip
    setTimeout(() => {
      if (!isHoveringTooltip.value) {
        hideTooltip();
      }
    }, 100);
  };

  // Handle mouse enter on tooltip
  const handleTooltipMouseEnter = () => {
    isHoveringTooltip.value = true;
  };

  // Handle mouse leave from tooltip
  const handleTooltipMouseLeave = () => {
    isHoveringTooltip.value = false;
    hideTooltip();
  };

  // Handle focus on trigger
  const handleTriggerFocus = () => {
    showTooltipImmediate();
  };

  // Handle blur on trigger
  const handleTriggerBlur = () => {
    hideTooltip();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHoverTimeout();
    };
  }, []);

  // Add keyboard listener when tooltip is visible
  useEffect(() => {
    if (isVisible.value) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isVisible.value]);

  return (
    <>
      {/* Trigger wrapper */}
      <div
        ref={triggerRef}
        class={`inline-block ${className || ""}`}
        aria-describedby={isVisible.value ? tooltipId.current : undefined}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
      >
        {children}
      </div>

      {/* Tooltip */}
      {isVisible.value && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          class="tooltip-container fixed z-[9999] pointer-events-auto"
          style={{
            top: `${tooltipPosition.value.top}px`,
            left: `${tooltipPosition.value.left}px`,
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div
            class="tooltip-content max-w-[250px] px-[10px] py-[6px] bg-[#1a1a1a] border border-[#00d9ff] text-[#ffffff] text-xs font-mono leading-normal break-words"
            style={{
              borderRadius: "0",
              boxShadow: "0 2px 8px rgba(0, 217, 255, 0.2)",
            }}
          >
            {content}
          </div>

          {/* Animations */}
          <style>
            {`
              @keyframes tooltip-fade-in {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }

              .tooltip-container {
                animation: tooltip-fade-in 150ms ease-out forwards;
              }

              /* Respect prefers-reduced-motion */
              @media (prefers-reduced-motion: reduce) {
                .tooltip-container {
                  animation: none;
                }
              }
            `}
          </style>
        </div>
      )}
    </>
  );
}

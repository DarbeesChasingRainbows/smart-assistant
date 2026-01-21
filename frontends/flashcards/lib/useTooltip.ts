import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

/**
 * Hook for programmatic tooltip control
 *
 * Provides imperative control over tooltip visibility and positioning
 * for advanced use cases where declarative Tooltip component isn't sufficient.
 *
 * @example
 * const tooltip = useTooltip();
 *
 * return (
 *   <div>
 *     <button
 *       onMouseEnter={(e) => tooltip.show(e.currentTarget, "Click to edit")}
 *       onMouseLeave={() => tooltip.hide()}
 *     >
 *       Edit
 *     </button>
 *     {tooltip.render()}
 *   </div>
 * );
 */

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface UseTooltipReturn {
  /** Whether tooltip is currently visible */
  isVisible: boolean;

  /** Current tooltip content */
  content: string;

  /** Current tooltip position */
  position: TooltipPosition;

  /** Show tooltip at element position */
  show: (element: HTMLElement, content: string, position?: "top" | "bottom" | "left" | "right") => void;

  /** Hide tooltip */
  hide: () => void;

  /** Toggle tooltip visibility */
  toggle: (element: HTMLElement, content: string, position?: "top" | "bottom" | "left" | "right") => void;

  /** Render the tooltip (call this in your component JSX) */
  render: () => JSX.Element | null;
}

export function useTooltip(): UseTooltipReturn {
  const isVisible = useSignal(false);
  const content = useSignal("");
  const position = useSignal<TooltipPosition>({ x: 0, y: 0 });
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  const calculatePosition = (
    element: HTMLElement,
    preferredPosition: "top" | "bottom" | "left" | "right" = "top"
  ): TooltipPosition => {
    const rect = element.getBoundingClientRect();
    const offset = 8;

    let x = 0;
    let y = 0;

    switch (preferredPosition) {
      case "top":
        x = rect.left + rect.width / 2;
        y = rect.top - offset;
        break;
      case "bottom":
        x = rect.left + rect.width / 2;
        y = rect.bottom + offset;
        break;
      case "left":
        x = rect.left - offset;
        y = rect.top + rect.height / 2;
        break;
      case "right":
        x = rect.right + offset;
        y = rect.top + rect.height / 2;
        break;
    }

    return { x, y };
  };

  const show = (
    element: HTMLElement,
    tooltipContent: string,
    preferredPosition: "top" | "bottom" | "left" | "right" = "top"
  ) => {
    content.value = tooltipContent;
    position.value = calculatePosition(element, preferredPosition);
    isVisible.value = true;
  };

  const hide = () => {
    isVisible.value = false;
  };

  const toggle = (
    element: HTMLElement,
    tooltipContent: string,
    preferredPosition: "top" | "bottom" | "left" | "right" = "top"
  ) => {
    if (isVisible.value) {
      hide();
    } else {
      show(element, tooltipContent, preferredPosition);
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible.value) {
        hide();
      }
    };

    if (isVisible.value) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isVisible.value]);

  const render = () => {
    if (!isVisible.value) return null;

    return (
      <div
        id={tooltipId.current}
        role="tooltip"
        class="fixed z-[9999] pointer-events-none"
        style={{
          top: `${position.value.y}px`,
          left: `${position.value.x}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div
          class="max-w-[250px] px-[10px] py-[6px] bg-[#1a1a1a] border border-[#00d9ff] text-[#ffffff] text-xs font-mono leading-normal break-words"
          style={{
            borderRadius: "0",
            boxShadow: "0 2px 8px rgba(0, 217, 255, 0.2)",
          }}
        >
          {content.value}
        </div>
      </div>
    );
  };

  return {
    isVisible: isVisible.value,
    content: content.value,
    position: position.value,
    show,
    hide,
    toggle,
    render,
  };
}

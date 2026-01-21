/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

/**
 * Individual toast notification component with Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Border treatment matching variant type
 * - Monospace font
 * - Auto-dismiss with progress bar
 * - Slide-in animation from right
 *
 * Accessibility:
 * - role="status" for info/success (polite)
 * - role="alert" for warning/error (assertive)
 * - aria-live regions for screen reader announcements
 * - aria-atomic="true" for complete message reading
 * - Keyboard dismissible (Enter/Space/Esc)
 * - Pause on hover/focus
 * - Respects prefers-reduced-motion
 *
 * Research sources:
 * - Sara Soueidan: https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/
 * - Scott O'Hara: https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html
 * - MDN ARIA alert: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role
 */

export interface ToastProps {
  /** Unique identifier */
  id: string;

  /** Toast type determines styling and ARIA role */
  variant: "info" | "success" | "warning" | "error";

  /** Message to display */
  message: string;

  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss, default: 5000) */
  duration?: number;

  /** Whether the toast can be manually dismissed (default: true) */
  dismissible?: boolean;

  /** Callback when toast is dismissed */
  onDismiss?: () => void;
}

const variantConfig = {
  info: {
    borderColor: "#00d9ff",
    bgColor: "#0a0a1a",
    icon: "ℹ",
    role: "status" as const,
    ariaLive: "polite" as const,
  },
  success: {
    borderColor: "#00ff88",
    bgColor: "#001a0f",
    icon: "✓",
    role: "status" as const,
    ariaLive: "polite" as const,
  },
  warning: {
    borderColor: "#ffb000",
    bgColor: "#1f1500",
    icon: "⚠",
    role: "alert" as const,
    ariaLive: "assertive" as const,
  },
  error: {
    borderColor: "#ff4444",
    bgColor: "#1a0000",
    icon: "▲",
    role: "alert" as const,
    ariaLive: "assertive" as const,
  },
};

export default function Toast({
  id,
  variant,
  message,
  duration = 5000,
  dismissible = true,
  onDismiss,
}: ToastProps) {
  const config = variantConfig[variant];
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(duration);
  const isPaused = useSignal(false);
  const progress = useSignal(100);
  const isExiting = useSignal(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDismiss = () => {
    clearTimer();
    isExiting.value = true;
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const startTimer = () => {
    if (duration === 0) return;

    startTimeRef.current = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingTimeRef.current - elapsed);
      progress.value = (remaining / duration) * 100;

      if (remaining <= 0) {
        handleDismiss();
      } else {
        timerRef.current = window.setTimeout(updateProgress, 16); // ~60fps
      }
    };

    updateProgress();
  };

  const pauseTimer = () => {
    if (duration === 0 || isPaused.value) return;

    clearTimer();
    isPaused.value = true;
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const resumeTimer = () => {
    if (duration === 0 || !isPaused.value) return;

    isPaused.value = false;
    startTimer();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      handleDismiss();
    }
  };

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      aria-atomic="true"
      class={`
        toast-notification
        w-[360px]
        bg-[#1a1a1a]
        border-2
        p-4
        flex
        items-start
        gap-3
        relative
        overflow-hidden
        ${isExiting.value ? "toast-exit" : "toast-enter"}
      `}
      style={{
        borderColor: config.borderColor,
        borderRadius: "0",
        backgroundColor: config.bgColor,
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      tabIndex={dismissible ? 0 : -1}
      onKeyDown={dismissible ? handleKeyDown : undefined}
    >
      {/* Icon */}
      <div
        class="flex-shrink-0 text-2xl font-mono leading-none"
        style={{ color: config.borderColor }}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      {/* Message */}
      <div class="flex-1 text-sm font-mono text-[#ddd] leading-relaxed">
        {message}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          class="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 transition-colors text-[#888] hover:text-[#ddd] -mr-2 -mt-2"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style="border-radius: 0;"
        >
          <span class="text-xl font-mono">×</span>
        </button>
      )}

      {/* Progress bar */}
      {duration > 0 && (
        <div
          class="absolute bottom-0 left-0 h-[2px] transition-all"
          style={{
            width: `${progress.value}%`,
            backgroundColor: config.borderColor,
            transitionDuration: isPaused.value ? "0ms" : "16ms",
          }}
          aria-hidden="true"
        />
      )}

      {/* Animations */}
      <style>
        {`
          @keyframes toast-slide-in {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes toast-slide-out {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(400px);
              opacity: 0;
            }
          }

          .toast-enter {
            animation: toast-slide-in 300ms ease-out forwards;
          }

          .toast-exit {
            animation: toast-slide-out 300ms ease-out forwards;
          }

          /* Respect prefers-reduced-motion */
          @media (prefers-reduced-motion: reduce) {
            .toast-enter,
            .toast-exit {
              animation: none;
            }
          }

          /* Focus outline matching theme */
          .toast-notification:focus {
            outline: 2px solid ${config.borderColor};
            outline-offset: 2px;
          }
        `}
      </style>
    </div>
  );
}

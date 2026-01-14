/**
 * Toast Notification System
 *
 * Displays temporary notification messages to users.
 * Follows Sci-Fi HUD theme with color-coded status messages.
 * Auto-dismisses after configurable timeout.
 */

import { signal } from "@preact/signals";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// Global toast state
export const toasts = signal<Toast[]>([]);

let toastIdCounter = 0;

/**
 * Show a toast notification
 *
 * @param type - Toast type (success, error, warning, info)
 * @param message - Message to display
 * @param duration - Auto-dismiss duration in ms (default: 5000)
 */
export function showToast(
  type: ToastType,
  message: string,
  duration: number = 5000,
) {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, type, message, duration };

  // Add toast to array
  toasts.value = [...toasts.value, toast];

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(id: string) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

/**
 * Clear all toasts
 */
export function clearToasts() {
  toasts.value = [];
}

/**
 * Toast Container Island
 *
 * Renders all active toasts in bottom-right corner.
 * Place once at the app root level.
 */
export default function ToastContainer() {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-[#00ff88]/20",
          border: "border-[#00ff88]",
          text: "text-[#00ff88]",
          icon: "✓",
        };
      case "error":
        return {
          bg: "bg-red-500/20",
          border: "border-red-500",
          text: "text-red-400",
          icon: "✕",
        };
      case "warning":
        return {
          bg: "bg-[#ffb000]/20",
          border: "border-[#ffb000]",
          text: "text-[#ffb000]",
          icon: "⚠",
        };
      case "info":
        return {
          bg: "bg-[#00d9ff]/20",
          border: "border-[#00d9ff]",
          text: "text-[#00d9ff]",
          icon: "ℹ",
        };
    }
  };

  return (
    <div class="toast toast-end toast-bottom z-50">
      {toasts.value.map((toast) => {
        const styles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            class={`alert ${styles.bg} border-2 ${styles.border} shadow-lg min-w-[280px] max-w-md`}
          >
            <div class="flex items-start gap-3 w-full">
              <span class={`text-2xl ${styles.text}`}>{styles.icon}</span>
              <div class="flex-1 min-w-0">
                <p class={`font-mono text-sm ${styles.text}`}>
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                class={`btn btn-ghost btn-xs min-h-[32px] min-w-[32px] ${styles.text} hover:bg-white/10`}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper functions for common toast messages
 */
export const toast = {
  success: (message: string, duration?: number) =>
    showToast("success", message, duration),
  error: (message: string, duration?: number) =>
    showToast("error", message, duration),
  warning: (message: string, duration?: number) =>
    showToast("warning", message, duration),
  info: (message: string, duration?: number) =>
    showToast("info", message, duration),
};

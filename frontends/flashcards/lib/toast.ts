import { signal } from "@preact/signals";

/**
 * Toast notification data structure
 */
export interface ToastData {
  /** Unique identifier */
  id: string;

  /** Toast type determines styling and ARIA role */
  variant: "info" | "success" | "warning" | "error";

  /** Message to display */
  message: string;

  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
}

/**
 * Global signal containing active toasts
 */
export const toasts = signal<ToastData[]>([]);

/**
 * Show a new toast notification
 *
 * @example
 * showToast({ variant: "success", message: "Flashcard saved!" });
 *
 * @example
 * showToast({
 *   variant: "error",
 *   message: "Failed to save flashcard",
 *   duration: 0 // No auto-dismiss
 * });
 */
export function showToast(data: Omit<ToastData, "id">): string {
  const id = crypto.randomUUID();
  toasts.value = [...toasts.value, { ...data, id }];
  return id;
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(id: string): void {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  toasts.value = [];
}

/**
 * Convenience methods for common toast types
 */
export const toast = {
  info: (message: string, duration?: number) =>
    showToast({ variant: "info", message, duration }),

  success: (message: string, duration?: number) =>
    showToast({ variant: "success", message, duration }),

  warning: (message: string, duration?: number) =>
    showToast({ variant: "warning", message, duration }),

  error: (message: string, duration?: number) =>
    showToast({ variant: "error", message, duration }),
};

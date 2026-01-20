/** @jsxImportSource preact */
import { useComputed } from "@preact/signals";
import { toasts, dismissToast } from "../lib/toast.ts";
import Toast from "../components/ui/Toast.tsx";

/**
 * Toast notification container island
 *
 * Manages display of toast notifications in a fixed bottom-right position.
 * Implements proper ARIA live regions for accessibility.
 *
 * Features:
 * - Fixed positioning in bottom-right corner
 * - Stacks toasts vertically with 8px gap
 * - Maximum 3 visible toasts (queues additional toasts)
 * - ARIA live region exists at render time (not dynamically created)
 * - Respects accessibility best practices
 *
 * Accessibility:
 * - Pre-rendered live region container
 * - Proper ARIA roles delegated to individual Toast components
 * - Does not interfere with keyboard navigation
 * - Screen reader announcements handled by Toast components
 *
 * Usage:
 * Add to _app.tsx layout to make toasts available throughout the application.
 *
 * @example
 * // In _app.tsx
 * import ToastContainer from "./islands/ToastContainer.tsx";
 *
 * export default function App({ Component }) {
 *   return (
 *     <html>
 *       <body>
 *         <Component />
 *         <ToastContainer />
 *       </body>
 *     </html>
 *   );
 * }
 */

const MAX_VISIBLE_TOASTS = 3;

export default function ToastContainer() {
  // Show only the most recent MAX_VISIBLE_TOASTS toasts
  // Older toasts are queued and will appear as newer ones are dismissed
  const visibleToasts = useComputed(() => {
    const all = toasts.value;
    return all.slice(-MAX_VISIBLE_TOASTS);
  });

  return (
    <>
      {/*
        ARIA live region container - MUST exist at render time.
        Individual Toast components set their own role and aria-live attributes.
        This container provides the fixed positioning and layout.
      */}
      <div
        class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
        aria-label="Notifications"
      >
        {visibleToasts.value.map((toast) => (
          <div key={toast.id} class="pointer-events-auto">
            <Toast
              id={toast.id}
              variant={toast.variant}
              message={toast.message}
              duration={toast.duration}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>

      {/* Screen reader only: announce queue status when toasts are hidden */}
      {toasts.value.length > MAX_VISIBLE_TOASTS && (
        <div class="sr-only" role="status" aria-live="polite">
          {toasts.value.length - MAX_VISIBLE_TOASTS} additional notifications
          queued
        </div>
      )}

      {/* Utility styles */}
      <style>
        {`
          /* Screen reader only utility class */
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
        `}
      </style>
    </>
  );
}

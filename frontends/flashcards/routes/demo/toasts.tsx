/** @jsxImportSource preact */
import { Head } from "fresh/runtime";
import ToastDemoControls from "../../islands/ToastDemoControls.tsx";

/**
 * Toast notification system demo page
 *
 * Navigate to /demo/toasts to test the toast system
 */
export default function ToastDemo() {
  return (
    <>
      <Head>
        <title>Toast Demo - Flashcards</title>
      </Head>
      <ToastDemoControls />

      <div class="min-h-screen bg-[#0a0a0a] text-[#ddd] p-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-mono text-[#00d9ff] mb-2 border-b-2 border-[#00d9ff] pb-2">
            Toast Notification System
          </h1>
          <p class="text-sm text-[#888] mb-8 font-mono">
            Accessible toast notifications with Sci-Fi HUD styling
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Info Toast */}
            <div class="bg-[#1a1a1a] border-2 border-[#333] p-6">
              <h2 class="text-xl font-mono text-[#00d9ff] mb-3">Info Toast</h2>
              <p class="text-sm text-[#aaa] mb-4 font-mono">
                Non-critical informational messages. Uses role="status" and aria-live="polite".
              </p>
              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#0a0a1a] border-2 border-[#00d9ff] text-[#00d9ff] font-mono hover:bg-[#00d9ff]/10 transition-colors"
                onClick={() => {
                  // Will be imported in island version
                  globalThis.showInfoToast?.();
                }}
              >
                Show Info Toast
              </button>
            </div>

            {/* Success Toast */}
            <div class="bg-[#1a1a1a] border-2 border-[#333] p-6">
              <h2 class="text-xl font-mono text-[#00ff88] mb-3">Success Toast</h2>
              <p class="text-sm text-[#aaa] mb-4 font-mono">
                Confirmation of successful operations. Uses role="status" and aria-live="polite".
              </p>
              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#001a0f] border-2 border-[#00ff88] text-[#00ff88] font-mono hover:bg-[#00ff88]/10 transition-colors"
                onClick={() => {
                  globalThis.showSuccessToast?.();
                }}
              >
                Show Success Toast
              </button>
            </div>

            {/* Warning Toast */}
            <div class="bg-[#1a1a1a] border-2 border-[#333] p-6">
              <h2 class="text-xl font-mono text-[#ffb000] mb-3">Warning Toast</h2>
              <p class="text-sm text-[#aaa] mb-4 font-mono">
                Important non-critical warnings. Uses role="alert" and aria-live="assertive".
              </p>
              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#1f1500] border-2 border-[#ffb000] text-[#ffb000] font-mono hover:bg-[#ffb000]/10 transition-colors"
                onClick={() => {
                  globalThis.showWarningToast?.();
                }}
              >
                Show Warning Toast
              </button>
            </div>

            {/* Error Toast */}
            <div class="bg-[#1a1a1a] border-2 border-[#333] p-6">
              <h2 class="text-xl font-mono text-[#ff4444] mb-3">Error Toast</h2>
              <p class="text-sm text-[#aaa] mb-4 font-mono">
                Critical errors requiring attention. Uses role="alert" and aria-live="assertive".
              </p>
              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#1a0000] border-2 border-[#ff4444] text-[#ff4444] font-mono hover:bg-[#ff4444]/10 transition-colors"
                onClick={() => {
                  globalThis.showErrorToast?.();
                }}
              >
                Show Error Toast
              </button>
            </div>
          </div>

          {/* Additional Controls */}
          <div class="bg-[#1a1a1a] border-2 border-[#00d9ff] p-6 mb-8">
            <h2 class="text-xl font-mono text-[#00d9ff] mb-4">Advanced Testing</h2>

            <div class="space-y-3">
              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#0a0a1a] border border-[#00d9ff] text-[#00d9ff] font-mono hover:bg-[#00d9ff]/10 transition-colors block w-full text-left"
                onClick={() => {
                  globalThis.showMultipleToasts?.();
                }}
              >
                Show Multiple Toasts (Queue Test)
              </button>

              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#0a0a1a] border border-[#ffb000] text-[#ffb000] font-mono hover:bg-[#ffb000]/10 transition-colors block w-full text-left"
                onClick={() => {
                  globalThis.showPersistentToast?.();
                }}
              >
                Show Persistent Toast (No Auto-Dismiss)
              </button>

              <button
                type="button"
                class="min-h-[44px] px-6 py-2 bg-[#0a0a1a] border border-[#ff4444] text-[#ff4444] font-mono hover:bg-[#ff4444]/10 transition-colors block w-full text-left"
                onClick={() => {
                  globalThis.dismissAllToasts?.();
                }}
              >
                Dismiss All Toasts
              </button>
            </div>
          </div>

          {/* Accessibility Notes */}
          <div class="bg-[#1a1a1a] border-2 border-[#888] p-6">
            <h2 class="text-xl font-mono text-[#888] mb-4">Accessibility Features</h2>
            <ul class="space-y-2 text-sm text-[#aaa] font-mono list-disc list-inside">
              <li>ARIA live regions pre-rendered at mount time</li>
              <li>Proper role assignment (status vs alert)</li>
              <li>Keyboard dismissible (Tab, Enter/Space/Esc)</li>
              <li>Pause on hover/focus</li>
              <li>Respects prefers-reduced-motion</li>
              <li>44px minimum touch targets (Fitts's Law)</li>
              <li>High contrast colors (WCAG AA)</li>
              <li>Screen reader announcements with aria-atomic</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

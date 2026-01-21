/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in Preact component trees.
 * Displays fallback UI instead of blank screen when errors occur.
 * Uses Preact's useErrorBoundary hook for error catching.
 */

import { useErrorBoundary } from "preact/hooks";
import type { ComponentChildren } from "preact";

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
  onError?: (error: Error, errorInfo: { componentStack?: string }) => void;
}

/**
 * Error Boundary wrapper component
 *
 * Wraps islands and routes to catch errors gracefully.
 * Displays Sci-Fi HUD themed error UI with retry button.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps) {
  const [error, resetError] = useErrorBoundary((error, errorInfo) => {
    // Log error for debugging
    console.error("ErrorBoundary caught error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Call optional error handler
    if (onError) {
      onError(error, errorInfo);
    }
  });

  if (error) {
    // Use custom fallback if provided, otherwise default error UI
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div class="min-h-[200px] flex items-center justify-center p-4">
        <div class="card bg-[#1a1a1a] border-2 border-red-500 shadow-xl max-w-lg w-full">
          <div class="card-body p-6">
            <div class="flex items-start gap-3 mb-4">
              <div class="text-red-500 text-3xl">⚠</div>
              <div class="flex-1">
                <h2 class="text-xl font-mono text-red-400 mb-2">
                  [SYSTEM ERROR]
                </h2>
                <p class="text-[#888] font-mono text-sm mb-1">
                  A component encountered an unexpected error.
                </p>
                <details class="mt-3">
                  <summary class="text-xs text-[#00d9ff] cursor-pointer hover:underline font-mono">
                    Technical Details
                  </summary>
                  <pre class="text-xs text-red-400 mt-2 p-3 bg-[#0a0a0a] border border-[#333] overflow-x-auto font-mono">
                    {error.message}
                  </pre>
                </details>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={resetError}
                class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] flex-1 font-mono"
              >
                <span class="mr-2">↻</span>
                Try Again
              </button>
              <button
                type="button"
                onClick={() => globalThis.location.reload()}
                class="btn bg-[#333] hover:bg-[#444] border border-[#555] text-white min-h-[44px] flex-1 font-mono"
              >
                <span class="mr-2">⟳</span>
                Reload Page
              </button>
            </div>

            <p class="text-xs text-[#666] mt-4 font-mono text-center">
              If this error persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Compact Error Boundary - for smaller UI sections
 */
export function CompactErrorBoundary({
  children,
}: { children: ComponentChildren }) {
  const [error, resetError] = useErrorBoundary();

  if (error) {
    return (
      <div class="p-4 bg-red-500/10 border border-red-500 text-center">
        <p class="text-red-400 font-mono text-sm mb-3">
          ⚠ Error: {error.message}
        </p>
        <button
          type="button"
          onClick={resetError}
          class="btn btn-sm bg-red-500/20 hover:bg-red-500/30 border border-red-400 text-red-400 min-h-[44px] font-mono"
        >
          <span class="mr-2">↻</span>
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

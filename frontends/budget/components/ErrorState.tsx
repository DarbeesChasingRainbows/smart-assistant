/**
 * ErrorState Component
 *
 * Displays user-friendly error messages for API failures.
 * Provides retry functionality and specific error context.
 * Follows Sci-Fi HUD theme with red error styling.
 */

import type { ComponentChildren } from "preact";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  children?: ComponentChildren;
}

/**
 * Full error state component with retry button
 *
 * Usage:
 * ```tsx
 * <ErrorState
 *   title="Failed to Load Transactions"
 *   message="Could not connect to the server. Please check your connection and try again."
 *   onRetry={fetchTransactions}
 * />
 * ```
 */
export function ErrorState({
  title = "Error Loading Data",
  message,
  onRetry,
  retryText = "Try Again",
  children,
}: ErrorStateProps) {
  return (
    <div class="card bg-[#1a1a1a] border-2 border-red-500 shadow-xl">
      <div class="card-body p-6">
        <div class="flex items-start gap-3 mb-4">
          <div class="text-red-500 text-3xl flex-shrink-0">⚠</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-mono text-red-400 mb-2">
              [{title}]
            </h3>
            <p class="text-[#aaa] font-mono text-sm">
              {message}
            </p>
            {children && (
              <div class="mt-3">
                {children}
              </div>
            )}
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono w-full sm:w-auto"
          >
            <span class="mr-2">↻</span>
            {retryText}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline error message
 */
export interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div class="flex items-center justify-between gap-3 p-3 bg-red-500/10 border border-red-500 text-red-400">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span class="text-lg flex-shrink-0">⚠</span>
        <span class="font-mono text-sm">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          class="btn btn-sm bg-red-500/20 hover:bg-red-500/30 border border-red-400 text-red-400 min-h-[44px] font-mono flex-shrink-0"
        >
          <span class="mr-1">↻</span>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Network error state - specific for connection issues
 */
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection."
      onRetry={onRetry}
      retryText="Retry Connection"
    >
      <div class="mt-2 p-3 bg-[#0a0a0a] border border-[#333]">
        <p class="text-xs text-[#888] font-mono">
          <strong class="text-[#00d9ff]">Troubleshooting:</strong>
        </p>
        <ul class="text-xs text-[#888] font-mono list-disc list-inside mt-1 space-y-1">
          <li>Check your internet connection</li>
          <li>Verify the backend API is running</li>
          <li>Check for firewall or proxy issues</li>
        </ul>
      </div>
    </ErrorState>
  );
}

/**
 * Not found error state - for 404 responses
 */
export function NotFoundError({
  resource = "resource",
  onBack,
}: {
  resource?: string;
  onBack?: () => void;
}) {
  return (
    <ErrorState
      title="Not Found"
      message={`The requested ${resource} could not be found.`}
      onRetry={onBack}
      retryText="Go Back"
    />
  );
}

/**
 * Permission error state - for 401/403 responses
 */
export function PermissionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Access Denied"
      message="You don't have permission to access this resource."
      onRetry={onRetry}
      retryText="Try Again"
    >
      <p class="text-xs text-[#888] font-mono mt-2">
        If you believe this is an error, please contact support.
      </p>
    </ErrorState>
  );
}

/**
 * Empty state - for when data is successfully loaded but empty
 */
export interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "📭",
  title,
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div class="card bg-[#1a1a1a] border border-[#333] shadow-xl">
      <div class="card-body p-8 text-center">
        <div class="text-6xl mb-4">{icon}</div>
        <h3 class="text-xl font-mono text-white mb-2">
          [{title}]
        </h3>
        <p class="text-[#888] font-mono text-sm mb-6">
          {message}
        </p>
        {onAction && actionText && (
          <button
            type="button"
            onClick={onAction}
            class="btn bg-[#00d9ff]/20 hover:bg-[#00d9ff]/30 border border-[#00d9ff] text-[#00d9ff] min-h-[44px] font-mono"
          >
            <span class="mr-2">+</span>
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Offline indicator banner
 */
export function OfflineBanner() {
  return (
    <div class="alert bg-[#ffb000]/20 border-2 border-[#ffb000] mb-4">
      <div class="flex items-center gap-3 w-full">
        <span class="text-2xl">📡</span>
        <div class="flex-1">
          <p class="font-mono text-sm text-[#ffb000]">
            <strong>[OFFLINE MODE]</strong>
          </p>
          <p class="font-mono text-xs text-[#888] mt-1">
            You're currently offline. Some features may be unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}

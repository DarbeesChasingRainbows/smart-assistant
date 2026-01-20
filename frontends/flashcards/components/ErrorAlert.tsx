/** @jsxImportSource preact */

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  type?: "error" | "warning" | "info";
  showRetryAfter?: number; // seconds until retry is available
}

/**
 * Reusable error alert component with optional retry button.
 * Supports rate-limit awareness with countdown timer.
 */
export default function ErrorAlert({
  message,
  onRetry,
  retryLabel = "Try Again",
  type = "error",
  showRetryAfter,
}: ErrorAlertProps) {
  const alertClass = {
    error: "alert-error",
    warning: "alert-warning",
    info: "alert-info",
  }[type];

  const iconPath = {
    error:
      "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    warning:
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  }[type];

  return (
    <div class={`alert ${alertClass} shadow-lg`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d={iconPath}
        />
      </svg>
      <div class="flex-1">
        <span>{message}</span>
        {showRetryAfter && showRetryAfter > 0 && (
          <span class="text-sm opacity-75 ml-2">
            (Retry available in {showRetryAfter}s)
          </span>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          onClick={onRetry}
          disabled={showRetryAfter !== undefined && showRetryAfter > 0}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

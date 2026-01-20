/** @jsxImportSource preact */

interface LoadingSpinnerProps {
  message?: string;
  showTimeoutWarning?: boolean;
  elapsedSeconds?: number;
}

/**
 * Loading spinner with optional timeout warning.
 * Shows a warning message if the request is taking longer than expected.
 */
export default function LoadingSpinner({
  message = "Loading...",
  showTimeoutWarning = false,
  elapsedSeconds = 0,
}: LoadingSpinnerProps) {
  return (
    <div class="flex flex-col items-center justify-center gap-4 p-8">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="text-gray-600">{message}</p>

      {showTimeoutWarning && elapsedSeconds >= 5 && (
        <div class="alert alert-warning max-w-md">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 class="font-bold">Taking longer than expected</h3>
            <div class="text-sm">
              The server might be busy. Please wait or try refreshing the page.
            </div>
          </div>
        </div>
      )}

      {showTimeoutWarning && elapsedSeconds >= 15 && (
        <div class="alert alert-error max-w-md">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 class="font-bold">Connection issue</h3>
            <div class="text-sm">
              The backend may be unavailable. Check if the server is running.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

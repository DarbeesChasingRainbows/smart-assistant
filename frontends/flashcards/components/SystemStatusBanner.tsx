/** @jsxImportSource preact */

type SystemStatus = {
  circuitBreakers: Record<
    string,
    {
      state: "Closed" | "Open" | "HalfOpen" | string;
      retryAfterSeconds?: number;
    }
  >;
};

interface SystemStatusBannerProps {
  status: SystemStatus | null;
  onRefresh?: () => void;
}

/**
 * Displays a banner when the system is in a degraded state (circuit breaker open).
 * Shows retry countdown when available.
 */
export default function SystemStatusBanner(
  { status, onRefresh }: SystemStatusBannerProps,
) {
  if (!status) return null;

  // Check if any circuit breaker is open
  const openCircuits = Object.entries(status.circuitBreakers).filter(
    ([_, cb]) => cb.state === "Open" || cb.state === "HalfOpen",
  );

  if (openCircuits.length === 0) return null;

  const maxRetryAfter = Math.max(
    ...openCircuits.map(([_, cb]) => cb.retryAfterSeconds ?? 0),
  );

  return (
    <div class="alert alert-warning shadow-lg mb-4">
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
      <div class="flex-1">
        <h3 class="font-bold">Service Temporarily Unavailable</h3>
        <div class="text-sm">
          Some features may be limited due to high demand or service issues.
          {maxRetryAfter > 0 && (
            <span class="ml-1">
              Please wait approximately {maxRetryAfter} seconds before retrying.
            </span>
          )}
        </div>
        <div class="text-xs opacity-75 mt-1">
          Affected services: {openCircuits.map(([name]) => name).join(", ")}
        </div>
      </div>
      {onRefresh && (
        <button type="button" class="btn btn-sm btn-ghost" onClick={onRefresh}>
          Refresh Status
        </button>
      )}
    </div>
  );
}

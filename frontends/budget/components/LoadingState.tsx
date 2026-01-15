/**
 * LoadingState Component
 *
 * Reusable skeleton loader components for the budget frontend.
 * Follows Sci-Fi HUD theme with dark backgrounds and cyan shimmer effect.
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Generic skeleton loader with shimmer animation
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      class={`bg-[#1a1a1a] border border-[#333] animate-pulse ${className}`}
      style={{
        background:
          "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 2s infinite",
      }}
    />
  );
}

/**
 * Dashboard card skeleton - matches dashboard card layout
 */
export function DashboardCardSkeleton() {
  return (
    <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
      <div class="card-body p-4 md:p-6">
        {/* Header */}
        <div class="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Content rows */}
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div class="flex justify-between items-center">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div class="flex justify-between items-center">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Button */}
        <Skeleton className="h-[44px] w-full mt-4" />
      </div>
    </div>
  );
}

/**
 * Budget summary skeleton - matches 3-column stat layout
 */
export function BudgetSummarySkeleton() {
  return (
    <div class="card bg-[#1a1a1a] shadow-xl border border-[#333]">
      <div class="card-body p-4 md:p-6">
        {/* Header */}
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[44px] w-32" />
        </div>

        {/* Stats grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div class="stat bg-[#0a0a0a] rounded border border-[#333] p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Transaction list skeleton
 */
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div class="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          class="flex justify-between items-center p-3 bg-[#1a1a1a] border border-[#333]"
        >
          <div class="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table skeleton - for transaction tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr class="border-b border-[#333]">
            <th class="bg-[#1a1a1a]">
              <Skeleton className="h-4 w-20" />
            </th>
            <th class="bg-[#1a1a1a]">
              <Skeleton className="h-4 w-24" />
            </th>
            <th class="bg-[#1a1a1a]">
              <Skeleton className="h-4 w-20" />
            </th>
            <th class="bg-[#1a1a1a]">
              <Skeleton className="h-4 w-16" />
            </th>
            <th class="bg-[#1a1a1a]">
              <Skeleton className="h-4 w-12" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} class="border-b border-[#333]">
              <td>
                <Skeleton className="h-4 w-24" />
              </td>
              <td>
                <Skeleton className="h-4 w-40" />
              </td>
              <td>
                <Skeleton className="h-4 w-32" />
              </td>
              <td>
                <Skeleton className="h-4 w-20" />
              </td>
              <td>
                <Skeleton className="h-8 w-16" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Loading spinner - for inline loading states
 */
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      class={`${
        sizeClasses[size]
      } border-2 border-[#333] border-t-[#00d9ff] rounded-full animate-spin`}
    />
  );
}

/**
 * Full page loading - for route-level loading
 */
export function PageLoading() {
  return (
    <div class="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div class="text-center">
        <LoadingSpinner size="lg" />
        <p class="text-[#00d9ff] font-mono mt-4 text-sm">
          LOADING SYSTEM DATA...
        </p>
      </div>
    </div>
  );
}

/**
 * Inline loading with text
 */
interface LoadingTextProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingText(
  { text = "Loading...", size = "md" }: LoadingTextProps,
) {
  return (
    <div class="flex items-center gap-3 text-[#888] font-mono">
      <LoadingSpinner size={size} />
      <span
        class={size === "sm"
          ? "text-xs"
          : size === "lg"
          ? "text-lg"
          : "text-sm"}
      >
        {text}
      </span>
    </div>
  );
}

/* Add shimmer animation to global styles - inject via CSS */
const style = document.createElement("style");
style.textContent = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;
if (typeof document !== "undefined") {
  document.head.appendChild(style);
}

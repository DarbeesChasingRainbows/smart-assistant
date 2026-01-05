import type { ComponentChildren } from "preact";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "gray" | "success" | "danger";
  class?: string;
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const colorClasses = {
  primary: "text-blue-600",
  white: "text-white",
  gray: "text-gray-400",
  success: "text-green-600",
  danger: "text-red-600",
};

export function Spinner({ size = "md", color = "primary", class: className = "" }: SpinnerProps) {
  return (
    <svg
      class={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface LoadingOverlayProps {
  show: boolean;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ show, message, fullScreen = false }: LoadingOverlayProps) {
  if (!show) return null;

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50"
    : "absolute inset-0 z-10";

  return (
    <div class={`${containerClasses} bg-white/80 backdrop-blur-sm flex items-center justify-center`}>
      <div class="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {message && <p class="text-gray-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}

export interface LoadingButtonProps {
  loading: boolean;
  children: ComponentChildren;
  loadingText?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  class?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const buttonVariants = {
  primary: "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white",
  secondary: "bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 border border-gray-300",
  danger: "bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white",
  ghost: "hover:bg-gray-100 text-gray-700",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

export function LoadingButton({
  loading,
  children,
  loadingText,
  disabled,
  variant = "primary",
  size = "md",
  class: className = "",
  type = "button",
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      class={`
        inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors
        disabled:cursor-not-allowed
        ${buttonVariants[variant]}
        ${buttonSizes[size]}
        ${className}
      `}
    >
      {loading && <Spinner size="sm" color={variant === "primary" || variant === "danger" ? "white" : "gray"} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
  class?: string;
}

const skeletonRounded = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({ width, height, rounded = "md", class: className = "" }: SkeletonProps) {
  return (
    <div
      class={`animate-pulse bg-gray-200 ${skeletonRounded[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3, class: className = "" }: { lines?: number; class?: string }) {
  return (
    <div class={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1rem"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ class: className = "" }: { class?: string }) {
  return (
    <div class={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div class="flex items-center gap-4 mb-4">
        <Skeleton width="3rem" height="3rem" rounded="full" />
        <div class="flex-1 space-y-2">
          <Skeleton height="1.25rem" width="60%" />
          <Skeleton height="0.875rem" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

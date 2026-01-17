import type { ComponentChildren } from "preact";

export interface CardProps {
  children: ComponentChildren;
  class?: string;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  rounded?: "none" | "sm" | "md" | "lg" | "xl";
  border?: boolean;
  hover?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const shadowClasses = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

const roundedClasses = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

export function Card({
  children,
  class: className = "",
  padding = "md",
  shadow = "sm",
  rounded = "lg",
  border = false,
  hover = false,
}: CardProps) {
  const classes = [
    "bg-white",
    paddingClasses[padding],
    shadowClasses[shadow],
    roundedClasses[rounded],
    border ? "border border-gray-200" : "",
    hover ? "hover:shadow-md transition-shadow cursor-pointer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div class={classes}>{children}</div>;
}

export interface CardHeaderProps {
  children: ComponentChildren;
  class?: string;
  action?: ComponentChildren;
}

export function CardHeader(
  { children, class: className = "", action }: CardHeaderProps,
) {
  return (
    <div class={`flex justify-between items-center mb-4 ${className}`}>
      <div class="text-lg font-semibold text-gray-900">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export interface CardContentProps {
  children: ComponentChildren;
  class?: string;
}

export function CardContent(
  { children, class: className = "" }: CardContentProps,
) {
  return <div class={className}>{children}</div>;
}

export interface CardFooterProps {
  children: ComponentChildren;
  class?: string;
  align?: "left" | "center" | "right" | "between";
}

const alignClasses = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
  between: "justify-between",
};

export function CardFooter(
  { children, class: className = "", align = "right" }: CardFooterProps,
) {
  return (
    <div
      class={`flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 ${
        alignClasses[align]
      } ${className}`}
    >
      {children}
    </div>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  class?: string;
}

const variantClasses = {
  default: "text-gray-900",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
  info: "text-blue-600",
};

const ringClasses = {
  default: "",
  success: "",
  warning: "",
  danger: "ring-2 ring-red-200",
  info: "",
};

export function StatCard({
  title,
  value,
  icon,
  subtitle,
  trend,
  variant = "default",
  class: className = "",
}: StatCardProps) {
  return (
    <Card class={`${ringClasses[variant]} ${className}`} padding="lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600">{title}</p>
          <p class={`text-3xl font-bold ${variantClasses[variant]}`}>{value}</p>
        </div>
        {icon && <div class="text-4xl">{icon}</div>}
      </div>
      {subtitle && <div class="mt-2 text-sm text-gray-500">{subtitle}</div>}
      {trend && (
        <div
          class={`mt-2 text-sm ${
            trend.value >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </Card>
  );
}

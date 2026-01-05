import type { ComponentChildren } from "preact";
import { Skeleton } from "./Spinner.tsx";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => ComponentChildren;
  sortable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (item: T, index: number) => void;
  rowClass?: (item: T, index: number) => string;
  class?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data available",
  emptyIcon = "📋",
  onRowClick,
  rowClass,
  class: className = "",
  striped = true,
  hoverable = true,
  compact = false,
}: TableProps<T>) {
  const cellPadding = compact ? "px-3 py-2" : "px-4 py-3";

  if (loading) {
    return (
      <div class={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    class={`${cellPadding} text-xs font-semibold text-gray-600 uppercase tracking-wider ${alignClasses[col.align || "left"]}`}
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} class={cellPadding}>
                      <Skeleton height="1.25rem" width="80%" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div class={`bg-white rounded-lg shadow-sm p-8 text-center ${className}`}>
        <div class="text-4xl mb-2">{emptyIcon}</div>
        <p class="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div class={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  class={`${cellPadding} text-xs font-semibold text-gray-600 uppercase tracking-wider ${alignClasses[col.align || "left"]}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                class={`
                  ${striped && index % 2 === 1 ? "bg-gray-50/50" : ""}
                  ${hoverable ? "hover:bg-gray-50" : ""}
                  ${onRowClick ? "cursor-pointer" : ""}
                  ${rowClass?.(item, index) || ""}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    class={`${cellPadding} text-sm text-gray-900 ${alignClasses[col.align || "left"]}`}
                  >
                    {col.render
                      ? col.render(item, index)
                      : (item as Record<string, unknown>)[col.key] as ComponentChildren}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  class?: string;
  showInfo?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  class: className = "",
  showInfo = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    pages.push(totalPages);
  }

  const startItem = (currentPage - 1) * (itemsPerPage || 20) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 20), totalItems || 0);

  return (
    <div class={`flex items-center justify-between ${className}`}>
      {showInfo && totalItems !== undefined && (
        <p class="text-sm text-gray-600">
          Showing {startItem} to {endItem} of {totalItems} results
        </p>
      )}
      <nav class="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          ←
        </button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} class="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              class={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                page === currentPage
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          →
        </button>
      </nav>
    </div>
  );
}

export interface BadgeProps {
  children: ComponentChildren;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  class?: string;
}

const badgeVariants = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

const badgeSizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  class: className = "",
}: BadgeProps) {
  return (
    <span
      class={`inline-flex items-center font-medium rounded-full ${badgeVariants[variant]} ${badgeSizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

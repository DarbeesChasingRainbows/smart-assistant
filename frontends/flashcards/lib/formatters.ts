/**
 * Formatting utilities for consistent display across the flashcards app
 *
 * All formatters follow the Sci-Fi HUD theme with monospace typography
 * for data/numbers and clear, technical presentation.
 */

// ============================================================================
// Date & Time Formatters
// ============================================================================

/**
 * Format a date string to localized date (e.g., "Jan 15, 2026")
 * @param dateStr ISO 8601 date string
 * @returns Formatted date string
 */
export function formatDate(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a date string to short date (e.g., "1/15/26")
 * @param dateStr ISO 8601 date string
 * @returns Formatted short date string
 */
export function formatDateShort(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    }).format(date);
  } catch {
    return "---";
  }
}

/**
 * Format a date string with time (e.g., "Jan 15, 2026 at 3:45 PM")
 * @param dateStr ISO 8601 date string
 * @returns Formatted date and time string
 */
export function formatDateTime(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a date string to time only (e.g., "3:45 PM")
 * @param dateStr ISO 8601 date string
 * @returns Formatted time string
 */
export function formatTime(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "--:--";
  }
}

/**
 * Format a date to ISO date string (YYYY-MM-DD) for input fields
 * @param date Date object or ISO string
 * @returns ISO date string
 */
export function formatDateForInput(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param dateStr ISO 8601 date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateStr: string | Date): string {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.floor(Math.abs(diffMs) / 1000);
    const isPast = diffMs < 0;

    if (diffSec < 60) return isPast ? "just now" : "in a moment";
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return isPast ? `${mins}m ago` : `in ${mins}m`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return isPast ? `${hours}h ago` : `in ${hours}h`;
    }
    if (diffSec < 2592000) {
      const days = Math.floor(diffSec / 86400);
      return isPast ? `${days}d ago` : `in ${days}d`;
    }
    if (diffSec < 31536000) {
      const months = Math.floor(diffSec / 2592000);
      return isPast ? `${months}mo ago` : `in ${months}mo`;
    }
    const years = Math.floor(diffSec / 31536000);
    return isPast ? `${years}y ago` : `in ${years}y`;
  } catch {
    return "unknown";
  }
}

// ============================================================================
// Number Formatters
// ============================================================================

/**
 * Format a number with thousands separators (e.g., 1,234)
 * @param num Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  try {
    return new Intl.NumberFormat("en-US").format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format a number with decimal places (e.g., 1,234.56)
 * @param num Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatDecimal(num: number, decimals = 2): string {
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format a percentage (e.g., "75.5%")
 * @param value Numerator
 * @param total Denominator
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  total: number,
  decimals = 1,
): string {
  if (total === 0) return "0%";
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a percentage from a decimal (e.g., 0.755 -> "75.5%")
 * @param decimal Decimal value (0-1)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentageFromDecimal(
  decimal: number,
  decimals = 1,
): string {
  const percentage = decimal * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a number with compact notation (e.g., 1.2K, 3.4M)
 * @param num Number to format
 * @returns Compact number string
 */
export function formatCompact(num: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    }).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format a file size in bytes to human readable (e.g., "1.2 MB")
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)} ${sizes[i]}`;
}

// ============================================================================
// Duration Formatters
// ============================================================================

/**
 * Format a duration in seconds to human readable (e.g., "2h 15m")
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a duration in milliseconds to human readable
 * @param ms Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return formatDuration(Math.floor(ms / 1000));
}

// ============================================================================
// Spaced Repetition Specific Formatters
// ============================================================================

/**
 * Format an interval in days to human readable (e.g., "< 1 day", "3 months", "1.2 years")
 * @param days Interval in days
 * @returns Formatted interval string
 */
export function formatInterval(days: number): string {
  if (days < 1) return "< 1 day";
  if (days === 1) return "1 day";
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = (days / 365).toFixed(1);
  return years === "1.0" ? "1 year" : `${years} years`;
}

/**
 * Format ease factor to percentage (e.g., 2.5 -> "250%")
 * @param easeFactor Ease factor (typically 1.3 - 3.0)
 * @returns Formatted ease factor
 */
export function formatEaseFactor(easeFactor: number): string {
  return `${Math.round(easeFactor * 100)}%`;
}

/**
 * Format review rating as text (e.g., "Again" -> "Again (0)")
 * @param rating Review rating
 * @returns Formatted rating with description
 */
export function formatReviewRating(
  rating: "Again" | "Hard" | "Good" | "Easy",
): string {
  const descriptions: Record<string, string> = {
    Again: "Again (0)",
    Hard: "Hard (1)",
    Good: "Good (2)",
    Easy: "Easy (3)",
  };
  return descriptions[rating] || rating;
}

/**
 * Format difficulty level with icon
 * @param difficulty Difficulty string
 * @returns Formatted difficulty with icon
 */
export function formatDifficulty(difficulty: string): string {
  const normalized = difficulty.toLowerCase();
  const icons: Record<string, string> = {
    easy: "🟢 Easy",
    medium: "🟡 Medium",
    difficult: "🟠 Difficult",
    hard: "🔴 Hard",
    expert: "🟣 Expert",
  };
  return icons[normalized] || difficulty;
}

/**
 * Format card status (new, learning, review, mastered)
 * @param repetitions Number of repetitions
 * @param easeFactor Ease factor
 * @returns Status string
 */
export function formatCardStatus(
  repetitions: number,
  easeFactor: number,
): string {
  if (repetitions === 0) return "New";
  if (repetitions < 5) return "Learning";
  if (easeFactor >= 2.5) return "Mastered";
  return "Review";
}

// ============================================================================
// User Stats Formatters
// ============================================================================

/**
 * Format accuracy as colored percentage
 * @param correct Number of correct answers
 * @param total Total number of answers
 * @returns Formatted accuracy string
 */
export function formatAccuracy(correct: number, total: number): string {
  if (total === 0) return "N/A";
  return formatPercentage(correct, total, 1);
}

/**
 * Format streak count (e.g., "🔥 5 day streak")
 * @param days Number of consecutive days
 * @returns Formatted streak string
 */
export function formatStreak(days: number): string {
  if (days === 0) return "No streak";
  if (days === 1) return "🔥 1 day";
  return `🔥 ${days} days`;
}

/**
 * Format quiz completion (e.g., "25 / 50 cards")
 * @param completed Number of cards completed
 * @param total Total number of cards
 * @returns Formatted completion string
 */
export function formatQuizProgress(completed: number, total: number): string {
  return `${completed} / ${total} cards`;
}

// ============================================================================
// List Formatters
// ============================================================================

/**
 * Format an array as a comma-separated list
 * @param items Array of strings
 * @param max Maximum items to show before "and N more"
 * @returns Formatted list string
 */
export function formatList(items: string[], max = 3): string {
  if (items.length === 0) return "None";
  if (items.length <= max) {
    return items.join(", ");
  }
  const visible = items.slice(0, max);
  const remaining = items.length - max;
  return `${visible.join(", ")}, and ${remaining} more`;
}

/**
 * Format tags as a badge list (for display)
 * @param tags Array of tag strings
 * @returns HTML-friendly tag string
 */
export function formatTags(tags: string[]): string {
  if (tags.length === 0) return "No tags";
  return tags.map((tag) => `#${tag}`).join(" ");
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a date string is valid
 * @param dateStr Date string to validate
 * @returns True if valid date
 */
export function isValidDate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid number
 * @param value Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

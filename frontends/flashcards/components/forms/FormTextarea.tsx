/** @jsxImportSource preact */

/**
 * FormTextarea - Multi-line text input with label and Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Dark background with border treatment
 * - Resizable by default
 * - Character counter option
 * - Error state with red accent
 *
 * Accessibility:
 * - Visible label (never hidden)
 * - Error messages linked via aria-describedby
 * - Required indicator visible in label
 * - Character count announced to screen readers
 * - Proper resize behavior
 *
 * @example
 * <FormTextarea
 *   label="Answer"
 *   value={answer.value}
 *   onChange={(e) => answer.value = e.currentTarget.value}
 *   rows={5}
 *   required
 * />
 *
 * @example
 * <FormTextarea
 *   label="Notes"
 *   value={notes.value}
 *   onChange={(e) => notes.value = e.currentTarget.value}
 *   maxLength={500}
 *   showCharCount
 *   helpText="Add any additional notes or context"
 * />
 */

export interface FormTextareaProps {
  /** Textarea label (always visible) */
  label: string;

  /** Textarea value */
  value: string;

  /** Change handler */
  onChange: (e: Event) => void;

  /** Input handler (alternative to onChange) */
  onInput?: (e: Event) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Number of visible rows */
  rows?: number;

  /** Error message to display */
  error?: string;

  /** Whether the field is required */
  required?: boolean;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Maximum character length */
  maxLength?: number;

  /** Show character count */
  showCharCount?: boolean;

  /** Allow resizing */
  resize?: "none" | "vertical" | "horizontal" | "both";

  /** Additional help text */
  helpText?: string;

  /** HTML id attribute */
  id?: string;

  /** HTML name attribute */
  name?: string;

  /** Additional CSS classes */
  class?: string;
}

export default function FormTextarea({
  label,
  value,
  onChange,
  onInput,
  placeholder,
  rows = 4,
  error,
  required = false,
  disabled = false,
  maxLength,
  showCharCount = false,
  resize = "vertical",
  helpText,
  id,
  name,
  class: className,
}: FormTextareaProps) {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${textareaId}-error`;
  const helpId = `${textareaId}-help`;
  const countId = `${textareaId}-count`;

  const charCount = value.length;
  const charLimit = maxLength || 0;
  const showCount = showCharCount || (maxLength !== undefined);

  const resizeClasses = {
    none: "resize-none",
    vertical: "resize-y",
    horizontal: "resize-x",
    both: "resize",
  };

  return (
    <div class={`space-y-2 ${className || ""}`}>
      {/* Label with optional character count */}
      <div class="flex items-center justify-between gap-4">
        <label
          htmlFor={textareaId}
          class="block text-sm font-medium text-[#ddd]"
        >
          {label}
          {required && (
            <span class="text-[#ff4444] ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {showCount && (
          <span
            id={countId}
            class={`text-xs font-mono ${
              maxLength && charCount > maxLength
                ? "text-[#ff4444]"
                : "text-[#888]"
            }`}
            aria-live="polite"
          >
            {charCount}{maxLength ? ` / ${maxLength}` : ""}
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        id={textareaId}
        name={name || textareaId}
        value={value}
        onChange={onChange}
        onInput={onInput}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        class={`
          w-full
          px-4
          py-3
          bg-[#0a0a0a]
          border-2
          text-[#ddd]
          placeholder:text-[#555]
          focus:outline-none
          focus:border-[#00d9ff]
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-colors
          ${resizeClasses[resize]}
          ${error ? "border-[#ff4444]" : "border-[#333]"}
        `}
        style="border-radius: 0; min-height: 44px;"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={
          `${error ? errorId : ""} ${helpText ? helpId : ""} ${showCount ? countId : ""}`
            .trim() || undefined
        }
      />

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpId} class="text-xs text-[#888]">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={errorId}
          class="text-sm text-[#ff4444] font-mono"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

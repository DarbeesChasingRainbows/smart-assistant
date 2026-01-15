/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

/**
 * FormSelect - Dropdown select with label and Sci-Fi HUD styling
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Dark background with border treatment
 * - Clear option grouping support
 * - Error state with red accent
 *
 * Accessibility:
 * - Visible label (never hidden)
 * - Error messages linked via aria-describedby
 * - Required indicator visible in label
 * - Minimum 44px height for touch targets
 * - Semantic option elements
 *
 * @example
 * <FormSelect
 *   label="Deck"
 *   value={selectedDeck.value}
 *   onChange={(e) => selectedDeck.value = e.currentTarget.value}
 *   required
 * >
 *   <option value="">Select a deck...</option>
 *   {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
 * </FormSelect>
 */

export interface FormSelectProps {
  /** Select label (always visible) */
  label: string;

  /** Selected value */
  value: string;

  /** Change handler */
  onChange: (e: Event) => void;

  /** Select options (passed as children) */
  children: ComponentChildren;

  /** Error message to display */
  error?: string;

  /** Whether the field is required */
  required?: boolean;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Additional help text */
  helpText?: string;

  /** HTML id attribute */
  id?: string;

  /** HTML name attribute */
  name?: string;

  /** Additional CSS classes */
  class?: string;
}

export default function FormSelect({
  label,
  value,
  onChange,
  children,
  error,
  required = false,
  disabled = false,
  helpText,
  id,
  name,
  class: className,
}: FormSelectProps) {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${selectId}-error`;
  const helpId = `${selectId}-help`;

  return (
    <div class={`space-y-2 ${className || ""}`}>
      {/* Label */}
      <label
        htmlFor={selectId}
        class="block text-sm font-medium text-[#ddd]"
      >
        {label}
        {required && (
          <span class="text-[#ff4444] ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Select */}
      <select
        id={selectId}
        name={name || selectId}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        class={`
          w-full
          min-h-[44px]
          px-4
          py-2
          bg-[#0a0a0a]
          border-2
          text-[#ddd]
          focus:outline-none
          focus:border-[#00d9ff]
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-colors
          cursor-pointer
          ${error ? "border-[#ff4444]" : "border-[#333]"}
        `}
        style="border-radius: 0;"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={`${error ? errorId : ""} ${helpText ? helpId : ""}`.trim() || undefined}
      >
        {children}
      </select>

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

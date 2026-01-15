/** @jsxImportSource preact */

/**
 * FormInput - Standardized text input with label and error display
 *
 * Design characteristics:
 * - Sharp corners (no border-radius)
 * - Dark background with border treatment
 * - Monospace font for technical data inputs
 * - Clear error state with red accent
 *
 * Accessibility:
 * - Visible label (never hidden)
 * - Error messages linked via aria-describedby
 * - Required indicator visible in label
 * - Minimum 44px height for touch targets
 * - Proper input type attributes
 *
 * @example
 * <FormInput
 *   label="Email Address"
 *   type="email"
 *   value={email.value}
 *   onChange={(e) => email.value = e.currentTarget.value}
 *   required
 * />
 *
 * @example
 * <FormInput
 *   label="Card Question"
 *   value={question.value}
 *   onChange={(e) => question.value = e.currentTarget.value}
 *   error="Question is required"
 *   placeholder="Enter your question..."
 * />
 */

export interface FormInputProps {
  /** Input label (always visible) */
  label: string;

  /** Input value */
  value: string;

  /** Change handler */
  onChange: (e: Event) => void;

  /** Input handler (alternative to onChange) */
  onInput?: (e: Event) => void;

  /** Input type */
  type?: "text" | "email" | "password" | "url" | "tel" | "number" | "search";

  /** Placeholder text */
  placeholder?: string;

  /** Error message to display */
  error?: string;

  /** Whether the field is required */
  required?: boolean;

  /** Whether the field is disabled */
  disabled?: boolean;

  /** Input mode for mobile keyboards */
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email" | "url";

  /** Use monospace font (default: false, except for number/decimal types) */
  monospace?: boolean;

  /** Additional help text */
  helpText?: string;

  /** HTML id attribute */
  id?: string;

  /** HTML name attribute */
  name?: string;

  /** Additional CSS classes */
  class?: string;
}

export default function FormInput({
  label,
  value,
  onChange,
  onInput,
  type = "text",
  placeholder,
  error,
  required = false,
  disabled = false,
  inputMode,
  monospace,
  helpText,
  id,
  name,
  class: className,
}: FormInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  // Use monospace for numeric types by default
  const shouldUseMonospace =
    monospace !== undefined ? monospace : (type === "number" || inputMode === "numeric" || inputMode === "decimal");

  return (
    <div class={`space-y-2 ${className || ""}`}>
      {/* Label */}
      <label
        htmlFor={inputId}
        class="block text-sm font-medium text-[#ddd]"
      >
        {label}
        {required && (
          <span class="text-[#ff4444] ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {/* Input */}
      <input
        id={inputId}
        name={name || inputId}
        type={type}
        value={value}
        onChange={onChange}
        onInput={onInput}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        class={`
          w-full
          min-h-[44px]
          px-4
          py-2
          bg-[#0a0a0a]
          border-2
          text-[#ddd]
          placeholder:text-[#555]
          focus:outline-none
          focus:border-[#00d9ff]
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-colors
          ${shouldUseMonospace ? "font-mono" : ""}
          ${error ? "border-[#ff4444]" : "border-[#333]"}
        `}
        style="border-radius: 0;"
        aria-invalid={error ? "true" : "false"}
        aria-describedby={`${error ? errorId : ""} ${helpText ? helpId : ""}`.trim() || undefined}
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

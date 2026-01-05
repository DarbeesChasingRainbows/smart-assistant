import type { JSX, ComponentChildren } from "preact";
import type { Signal } from "@preact/signals";

export interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value?: string | Signal<string>;
  onInput?: (value: string) => void;
  leftIcon?: ComponentChildren;
  rightIcon?: ComponentChildren;
  containerClass?: string;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  name?: string;
  id?: string;
  class?: string;
}

export function Input({
  label,
  error,
  hint,
  required,
  value,
  onInput,
  leftIcon,
  rightIcon,
  containerClass = "",
  class: className = "",
  id,
  disabled,
  placeholder,
  type = "text",
  maxLength,
  min,
  max,
  name,
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  
  // Handle both Signal and regular string values
  const inputValue = typeof value === "object" && value !== null && "value" in value 
    ? (value as Signal<string>).value 
    : value;

  const handleInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    if (typeof value === "object" && value !== null && "value" in value) {
      (value as Signal<string>).value = newValue;
    }
    onInput?.(newValue);
  };

  const baseInputClasses = [
    "w-full px-3 py-2 border rounded-md transition-colors",
    "focus:outline-none focus:ring-2",
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200",
    leftIcon ? "pl-10" : "",
    rightIcon ? "pr-10" : "",
    disabled ? "bg-gray-100 cursor-not-allowed" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div class={containerClass}>
      {label && (
        <label htmlFor={inputId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div class="relative">
        {leftIcon && (
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          name={name}
          value={inputValue}
          onInput={handleInput}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          min={min}
          max={max}
          class={baseInputClasses}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        />
        {rightIcon && (
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} class="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} class="mt-1 text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value?: string | Signal<string>;
  onInput?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  containerClass?: string;
  disabled?: boolean;
  id?: string;
  class?: string;
  name?: string;
}

export function Select({
  label,
  error,
  hint,
  required,
  value,
  onInput,
  options,
  placeholder,
  containerClass = "",
  class: className = "",
  id,
  disabled,
  name,
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  
  const selectValue = typeof value === "object" && value !== null && "value" in value 
    ? (value as Signal<string>).value 
    : value;

  const handleInput = (e: JSX.TargetedEvent<HTMLSelectElement>) => {
    const newValue = e.currentTarget.value;
    if (typeof value === "object" && value !== null && "value" in value) {
      (value as Signal<string>).value = newValue;
    }
    onInput?.(newValue);
  };

  const baseSelectClasses = [
    "w-full px-3 py-2 border rounded-md transition-colors",
    "focus:outline-none focus:ring-2",
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200",
    disabled ? "bg-gray-100 cursor-not-allowed" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div class={containerClass}>
      {label && (
        <label htmlFor={selectId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        disabled={disabled}
        value={selectValue}
        onInput={handleInput}
        required={required}
        class={baseSelectClasses}
        aria-invalid={error ? "true" : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p class="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p class="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

export interface TextareaProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value?: string | Signal<string>;
  onInput?: (value: string) => void;
  containerClass?: string;
  disabled?: boolean;
  id?: string;
  class?: string;
  name?: string;
  rows?: number;
  placeholder?: string;
}

export function Textarea({
  label,
  error,
  hint,
  required,
  value,
  onInput,
  containerClass = "",
  class: className = "",
  id,
  rows = 3,
  disabled,
  name,
  placeholder,
}: TextareaProps) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  
  const textareaValue = typeof value === "object" && value !== null && "value" in value 
    ? (value as Signal<string>).value 
    : value;

  const handleInput = (e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value;
    if (typeof value === "object" && value !== null && "value" in value) {
      (value as Signal<string>).value = newValue;
    }
    onInput?.(newValue);
  };

  const baseTextareaClasses = [
    "w-full px-3 py-2 border rounded-md transition-colors resize-y",
    "focus:outline-none focus:ring-2",
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200",
    disabled ? "bg-gray-100 cursor-not-allowed" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div class={containerClass}>
      {label && (
        <label htmlFor={textareaId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        disabled={disabled}
        placeholder={placeholder}
        value={textareaValue}
        onInput={handleInput}
        required={required}
        rows={rows}
        class={baseTextareaClasses}
        aria-invalid={error ? "true" : undefined}
      />
      {error && <p class="mt-1 text-sm text-red-600">{error}</p>}
      {hint && !error && <p class="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

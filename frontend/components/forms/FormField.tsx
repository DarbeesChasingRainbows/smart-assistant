import type { ComponentChildren } from "preact";

interface Props {
  label: string;
  error?: string | null;
  children: ComponentChildren;
  hint?: string;
}

export default function FormField({ label, error, children, hint }: Props) {
  return (
    <label class="block">
      <div class="text-sm font-medium text-gray-700 mb-1">{label}</div>
      {children}
      {hint && <div class="text-xs text-gray-500 mt-1">{hint}</div>}
      {error && <div class="text-sm text-red-600 mt-1">{error}</div>}
    </label>
  );
}

import type { ComponentChildren } from "preact";

interface Props {
  title: string;
  subtitle?: string;
  children: ComponentChildren;
  footer: ComponentChildren;
  onClose: () => void;
  disableClose?: boolean;
  large?: boolean;
}

export default function FormModal(
  { title, subtitle, children, footer, onClose, disableClose, large = false }: Props,
) {
  return (
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto">
      <div class={`bg-white rounded-xl shadow-xl w-full my-8 ${large ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div class="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <div class="text-lg font-semibold text-gray-900">{title}</div>
            {subtitle && <div class="text-sm text-gray-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            class="px-3 py-2 text-gray-600 hover:text-gray-900"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div class="px-5 py-4 space-y-3">
          {children}
        </div>

        <div class="px-5 py-4 border-t flex justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

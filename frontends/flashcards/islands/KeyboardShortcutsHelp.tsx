/** @jsxImportSource preact */
import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";
import Modal from "../components/ui/Modal.tsx";
import Badge from "../components/ui/Badge.tsx";
import {
  getShortcutsByScope,
  formatShortcut,
  shortcutsEnabled,
  registerShortcut,
  type ShortcutScope,
} from "../lib/keyboard.ts";

/**
 * KeyboardShortcutsHelp - Help modal showing all available keyboard shortcuts
 *
 * Features:
 * - Shows all shortcuts organized by scope (Global, Quiz, Forms, etc.)
 * - Triggered by "?" key (Shift+/)
 * - Sci-Fi HUD styling with sharp corners and monospace fonts
 * - Toggle to enable/disable shortcuts (WCAG 2.1.4 compliance)
 * - Fully keyboard accessible (Esc to close)
 *
 * WCAG Compliance:
 * - Visible text labels for all shortcuts (Kid Test)
 * - Minimum 44px touch targets for all buttons (Fitts's Law)
 * - Keyboard navigation support
 * - Screen reader friendly
 */

export default function KeyboardShortcutsHelp() {
  const isOpen = useSignal(false);

  // Group shortcuts by scope
  const shortcutsByScope = useComputed(() => {
    const grouped = getShortcutsByScope();

    // Convert Map to sorted array for display
    const result: Array<{ scope: ShortcutScope; shortcuts: typeof grouped extends Map<any, infer U> ? U : never }> = [];

    grouped.forEach((shortcuts, scope) => {
      if (shortcuts.length > 0) {
        result.push({ scope, shortcuts });
      }
    });

    // Sort scopes: global first, then alphabetically
    result.sort((a, b) => {
      if (a.scope === "global") return -1;
      if (b.scope === "global") return 1;
      return a.scope.localeCompare(b.scope);
    });

    return result;
  });

  // Format scope name for display
  const formatScopeName = (scope: ShortcutScope): string => {
    if (scope === "global") return "Global Shortcuts";
    if (scope === "quiz") return "Quiz Shortcuts";
    if (scope === "form") return "Form Shortcuts";
    if (scope === "modal") return "Modal Shortcuts";
    return scope.charAt(0).toUpperCase() + scope.slice(1) + " Shortcuts";
  };

  // Toggle shortcuts enabled/disabled
  const toggleShortcuts = () => {
    shortcutsEnabled.value = !shortcutsEnabled.value;
  };

  // Register the "?" shortcut to open help
  useEffect(() => {
    const cleanup = registerShortcut({
      key: "?",
      modifiers: ["shift"],
      handler: () => {
        isOpen.value = true;
      },
      description: "Show keyboard shortcuts help",
      scope: "global",
    });

    return cleanup;
  }, []);

  return (
    <Modal
      open={isOpen.value}
      onClose={() => isOpen.value = false}
      title="Keyboard Shortcuts"
      subtitle="All available keyboard shortcuts for the flashcards application"
      variant="accent"
      maxWidth="large"
    >
      <div class="space-y-6">
        {/* Shortcuts Toggle */}
        <div class="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#333]" style="border-radius: 0;">
          <div>
            <h3 class="text-sm font-semibold text-[#00d9ff] font-mono mb-1">
              Keyboard Shortcuts Status
            </h3>
            <p class="text-xs text-[#888]">
              Single-key shortcuts can be turned off for accessibility (WCAG 2.1.4)
            </p>
          </div>
          <button
            type="button"
            class="min-h-[44px] min-w-[100px] px-4 py-2 border-2 font-mono font-semibold transition-colors"
            style="border-radius: 0;"
            onClick={toggleShortcuts}
            class={shortcutsEnabled.value
              ? "bg-[#00ff88] border-[#00ff88] text-[#0a0a0a] hover:bg-[#00dd77]"
              : "bg-[#1a1a1a] border-[#ff4444] text-[#ff4444] hover:bg-[#2a0000]"
            }
            aria-label={shortcutsEnabled.value ? "Disable keyboard shortcuts" : "Enable keyboard shortcuts"}
          >
            {shortcutsEnabled.value ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* No shortcuts message */}
        {shortcutsByScope.value.length === 0 && (
          <div class="text-center py-8 text-[#888]">
            <p class="font-mono">No keyboard shortcuts are currently registered.</p>
            <p class="text-xs mt-2">Navigate to different parts of the app to see context-specific shortcuts.</p>
          </div>
        )}

        {/* Shortcuts by scope */}
        {shortcutsByScope.value.map(({ scope, shortcuts }) => (
          <div key={scope} class="space-y-3">
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-[#00d9ff] font-mono">
                {formatScopeName(scope)}
              </h3>
              <Badge variant="accent" size="small">
                {shortcuts.length}
              </Badge>
            </div>

            <div class="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={`${scope}-${index}`}
                  class="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] hover:border-[#444] transition-colors"
                  style="border-radius: 0;"
                >
                  <div class="flex-1">
                    <p class="text-sm text-[#ddd]">
                      {shortcut.description}
                    </p>
                  </div>
                  <div class="ml-4">
                    <kbd
                      class="px-3 py-1.5 text-sm font-mono font-bold bg-[#0a0a0a] text-[#00d9ff] border-2 border-[#00d9ff]"
                      style="border-radius: 0;"
                    >
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer tip */}
        <div class="mt-6 p-4 bg-[#001a1f] border border-[#00d9ff]" style="border-radius: 0;">
          <div class="flex items-start gap-3">
            <span class="text-[#00d9ff] font-mono font-bold text-lg">ℹ</span>
            <div class="flex-1">
              <p class="text-sm text-[#00d9ff] font-mono font-semibold mb-1">
                Accessibility Tip
              </p>
              <p class="text-xs text-[#88c5d3]">
                Press <kbd class="px-1 py-0.5 bg-[#0a0a0a] border border-[#00d9ff] font-mono text-[#00d9ff]" style="border-radius: 0;">Esc</kbd> to close this dialog.
                All interactive elements meet WCAG 2.1 AA standards for touch targets (minimum 44×44px).
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

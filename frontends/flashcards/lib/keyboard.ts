/** @jsxImportSource preact */
import { signal, effect } from "@preact/signals";

/**
 * Keyboard Shortcuts Manager
 *
 * WCAG 2.1.4 Compliance:
 * - Single character shortcuts can be turned off
 * - Shortcuts use modifier keys where appropriate
 * - All shortcuts are documented and discoverable
 *
 * TypeScript Best Practices:
 * - Uses proper KeyboardEvent typing
 * - Type-safe shortcut configuration
 * - Exports all types for consumer components
 */

export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";
export type ShortcutScope = "global" | "modal" | "quiz" | "form" | string;

export interface ShortcutConfig {
  /** The key to listen for (e.g., "n", "Enter", "Escape") */
  key: string;

  /** Optional modifier keys (Ctrl, Alt, Shift, Meta/Cmd) */
  modifiers?: ModifierKey[];

  /** The handler function to execute when shortcut is triggered */
  handler: (e: KeyboardEvent) => void;

  /** Human-readable description for help modal */
  description: string;

  /** Scope where this shortcut is active */
  scope?: ShortcutScope;

  /** Whether this shortcut is currently enabled (for WCAG 2.1.4) */
  enabled?: boolean;

  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

// Global state for shortcuts
export const shortcutsEnabled = signal(true);
export const currentScope = signal<ShortcutScope>("global");

// Internal registry
const shortcutRegistry = new Map<string, ShortcutConfig[]>();

/**
 * Register a keyboard shortcut
 */
export function registerShortcut(config: ShortcutConfig): () => void {
  const scope = config.scope || "global";
  const existing = shortcutRegistry.get(scope) || [];

  const shortcut: ShortcutConfig = {
    ...config,
    enabled: config.enabled ?? true,
    preventDefault: config.preventDefault ?? true,
  };

  existing.push(shortcut);
  shortcutRegistry.set(scope, existing);

  // Return cleanup function
  return () => {
    const shortcuts = shortcutRegistry.get(scope);
    if (shortcuts) {
      const filtered = shortcuts.filter(s => s !== shortcut);
      shortcutRegistry.set(scope, filtered);
    }
  };
}

/**
 * Get all registered shortcuts for a scope
 */
export function getShortcuts(scope?: ShortcutScope): ShortcutConfig[] {
  if (scope) {
    return shortcutRegistry.get(scope) || [];
  }

  // Return all shortcuts from all scopes
  const all: ShortcutConfig[] = [];
  shortcutRegistry.forEach(shortcuts => {
    all.push(...shortcuts);
  });
  return all;
}

/**
 * Get shortcuts organized by scope for help display
 */
export function getShortcutsByScope(): Map<ShortcutScope, ShortcutConfig[]> {
  return new Map(shortcutRegistry);
}

/**
 * Clear all shortcuts (useful for testing)
 */
export function clearAllShortcuts(): void {
  shortcutRegistry.clear();
}

/**
 * Check if a keyboard event matches a shortcut config
 */
function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  // Check if key matches (case-insensitive)
  const keyMatches = event.key.toLowerCase() === config.key.toLowerCase();
  if (!keyMatches) return false;

  // Check modifiers
  const modifiers = config.modifiers || [];
  const hasCtrl = modifiers.includes("ctrl") || modifiers.includes("meta");
  const hasAlt = modifiers.includes("alt");
  const hasShift = modifiers.includes("shift");

  // Check if required modifiers are pressed
  const ctrlMatches = !hasCtrl || event.ctrlKey || event.metaKey;
  const altMatches = !hasAlt || event.altKey;
  const shiftMatches = !hasShift || event.shiftKey;

  // Check if NO extra modifiers are pressed
  const noExtraCtrl = hasCtrl || !(event.ctrlKey || event.metaKey);
  const noExtraAlt = hasAlt || !event.altKey;
  const noExtraShift = hasShift || !event.shiftKey;

  return ctrlMatches && altMatches && shiftMatches &&
         noExtraCtrl && noExtraAlt && noExtraShift;
}

/**
 * Global keyboard event handler
 */
function handleKeyboardEvent(event: KeyboardEvent): void {
  // Don't handle shortcuts when they're globally disabled
  if (!shortcutsEnabled.value) return;

  // Don't interfere with input fields unless it's a special key
  const target = event.target as HTMLElement;
  const isInput = target.tagName === "INPUT" ||
                  target.tagName === "TEXTAREA" ||
                  target.isContentEditable;

  // Allow certain keys even in inputs
  const specialKeys = ["Escape", "Enter"];
  const isSpecialKey = specialKeys.includes(event.key);

  if (isInput && !isSpecialKey) {
    // Allow Ctrl/Cmd+S in inputs
    if (event.key === "s" && (event.ctrlKey || event.metaKey)) {
      // Let it pass through
    } else {
      return;
    }
  }

  // Get shortcuts for current scope and global scope
  const globalShortcuts = shortcutRegistry.get("global") || [];
  const scopedShortcuts = shortcutRegistry.get(currentScope.value) || [];
  const allShortcuts = [...scopedShortcuts, ...globalShortcuts];

  // Find matching shortcut
  for (const config of allShortcuts) {
    if (config.enabled && matchesShortcut(event, config)) {
      if (config.preventDefault) {
        event.preventDefault();
      }
      config.handler(event);
      return; // Only trigger first match
    }
  }
}

/**
 * Initialize global keyboard listener
 */
let initialized = false;

export function initializeKeyboardShortcuts(): void {
  if (initialized) return;

  if (typeof document !== "undefined") {
    document.addEventListener("keydown", handleKeyboardEvent);
    initialized = true;
  }
}

/**
 * Cleanup keyboard listener (for testing)
 */
export function cleanupKeyboardShortcuts(): void {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", handleKeyboardEvent);
    initialized = false;
  }
}

/**
 * Format shortcut for display (e.g., "Ctrl+S", "N", "?")
 */
export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = [];
  const modifiers = config.modifiers || [];

  // Detect Mac vs Windows/Linux for proper Cmd/Ctrl display
  const isMac = typeof navigator !== "undefined" &&
                navigator.platform.toLowerCase().includes("mac");

  if (modifiers.includes("ctrl") || modifiers.includes("meta")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (modifiers.includes("alt")) {
    parts.push(isMac ? "⌥" : "Alt");
  }
  if (modifiers.includes("shift")) {
    parts.push(isMac ? "⇧" : "Shift");
  }

  // Format the key itself
  let keyDisplay = config.key;
  if (keyDisplay === " ") keyDisplay = "Space";
  if (keyDisplay === "?") keyDisplay = "?";
  if (keyDisplay === "/") keyDisplay = "/";

  parts.push(keyDisplay.toUpperCase());

  return parts.join("+");
}

/**
 * Preact hook for registering shortcuts in components
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts("quiz", [
 *   {
 *     key: "Space",
 *     handler: () => flipCard(),
 *     description: "Flip flashcard"
 *   }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  scope: ShortcutScope,
  shortcuts: Omit<ShortcutConfig, "scope">[]
): void {
  // Initialize on first use
  if (!initialized) {
    initializeKeyboardShortcuts();
  }

  // Register shortcuts and track cleanup functions
  const cleanups: (() => void)[] = [];

  shortcuts.forEach(shortcut => {
    const cleanup = registerShortcut({ ...shortcut, scope });
    cleanups.push(cleanup);
  });

  // Set current scope
  currentScope.value = scope;

  // Cleanup on unmount
  effect(() => {
    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  });
}

import { signal } from "@preact/signals";
import { IS_BROWSER } from "fresh/runtime";

export type Theme = "dark" | "light";

const STORAGE_KEY = "budget-theme";

// Get initial theme from localStorage or system preference
function getInitialTheme(): Theme {
  if (!IS_BROWSER) return "dark";
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  
  // Check system preference
  if (globalThis.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  
  return "dark";
}

// Global theme signal
export const theme = signal<Theme>(getInitialTheme());

// Toggle theme function
export function toggleTheme(): void {
  const newTheme = theme.value === "dark" ? "light" : "dark";
  setTheme(newTheme);
}

// Set specific theme
export function setTheme(newTheme: Theme): void {
  theme.value = newTheme;
  
  if (IS_BROWSER) {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }
}

// Apply theme to document
export function applyTheme(t: Theme): void {
  if (!IS_BROWSER) return;
  
  const html = document.documentElement;
  html.setAttribute("data-theme", t === "light" ? "corporate" : "dark");
  html.classList.remove("theme-light", "theme-dark");
  html.classList.add(`theme-${t}`);
}

// Initialize theme on page load
export function initTheme(): void {
  if (!IS_BROWSER) return;
  applyTheme(theme.value);
  
  // Listen for system theme changes
  globalThis.matchMedia?.("(prefers-color-scheme: light)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? "light" : "dark");
      }
    });
}

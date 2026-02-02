import { useEffect } from "preact/hooks";
import { theme, toggleTheme, initTheme } from "../lib/theme.ts";

interface ThemeToggleProps {
  class?: string;
}

export default function ThemeToggle({ class: className = "" }: ThemeToggleProps) {
  useEffect(() => {
    initTheme();
  }, []);

  const isDark = theme.value === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      class={`btn btn-ghost btn-sm min-h-[44px] min-w-[44px] p-2 font-mono transition-all duration-300 ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        // Sun icon for switching to light
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-[#ffb000]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon for switching to dark
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 text-[#6366f1]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

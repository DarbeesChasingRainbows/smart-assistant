import { useEffect } from "preact/hooks";
import { initTheme } from "../lib/theme.ts";

export default function ThemeInitializer() {
  useEffect(() => {
    initTheme();
  }, []);

  return null;
}

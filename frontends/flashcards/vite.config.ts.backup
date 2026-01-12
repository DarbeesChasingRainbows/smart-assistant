import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/flashcards/",
  plugins: [fresh(
    {
      serverEntry: "./main.tsx" // <--- The Fix: Explicitly point to the .tsx file
    }
  ), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5120",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:5120",
        changeOrigin: true,
      },
    },
  },
});

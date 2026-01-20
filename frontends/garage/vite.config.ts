import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/garage/",
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
  build: {
    // Build optimizations
    sourcemap: false, // Disable sourcemaps for faster builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ["preact", "@preact/signals", "lucide-preact"],
          ui: ["daisyui", "clsx", "tailwind-merge", "class-variance-authority"],
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ["preact", "@preact/signals", "lucide-preact"],
  },
});

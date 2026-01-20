import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/budget/",
  plugins: [
    fresh(
      {
        serverEntry: "./main.tsx", // The Fix: Explicitly point to the .tsx file
      },
    ),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5120",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Build optimizations
    minify: "esbuild",
    sourcemap: false, // Disable sourcemaps for faster builds
    rollupOptions: {
      external: ["@fresh/core"], // Externalize @fresh/core
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ["preact", "@preact/signals"],
    exclude: ["@fresh/core"], // Exclude from optimization
  },
});

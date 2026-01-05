import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
  css: {
    transformer: "lightningcss",
    lightningcss: {
      targets: {
        chrome: 120 << 16,
      },
    },
  },
  build: {
    cssMinify: "lightningcss",
  },
});

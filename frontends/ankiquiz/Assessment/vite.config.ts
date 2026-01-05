import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

// Get API URL from environment variable or fallback to localhost
const apiUrl = process.env.VITE_API_URL || "http://localhost:5137";
const uploadsUrl = process.env.VITE_UPLOADS_URL || "http://localhost:5137";

export default defineConfig({
  plugins: [
    fresh(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": apiUrl,
      "/uploads": uploadsUrl,
    },
  },
});

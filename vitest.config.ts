import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Smoke tests only — fast, no watch mode by default
    testTimeout: 10_000,
  },
});

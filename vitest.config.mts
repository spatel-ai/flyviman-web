import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit and component tests. Browser journeys live in e2e/ and run on Playwright.
export default defineConfig({
  plugins: [react()],
  // Resolves the "@/..." alias declared in tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

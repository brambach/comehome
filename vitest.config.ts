import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["tests/unit/setup.ts"],
    globalSetup: ["tests/unit/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

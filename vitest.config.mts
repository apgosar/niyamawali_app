import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    env: { PGLITE_DIR: "memory://", SESSION_SECRET: "test-secret-test-secret-test-secret" },
    testTimeout: 30000,
    hookTimeout: 60000, // every file boots its own in-memory database; ten at once can be slow
  },
});

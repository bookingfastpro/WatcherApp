import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      APP_SECRET: "test-secret-test-secret-test-secret-000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lève une erreur hors du runtime React Server : neutralisé pour les tests unitaires.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});

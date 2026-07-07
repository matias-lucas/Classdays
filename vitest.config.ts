import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// O alias "@/..." dos imports vem do tsconfig; o Vitest não lê o tsconfig,
// então repetimos o mapeamento aqui.
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

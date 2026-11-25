import { resolve } from "node:path";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  root: resolve(import.meta.dirname, "src"),
  publicDir: resolve(import.meta.dirname, "public"),

  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },

  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: resolve(import.meta.dirname, "src/index.html"),
            notes: resolve(import.meta.dirname, "src/notes/index.html"),
          },
        },
      },
    },
  },

  plugins: [cloudflare()],
});
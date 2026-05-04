import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tsConfigPaths(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  build: {
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
});


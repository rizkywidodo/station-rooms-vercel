import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tsConfigPaths(),
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
});
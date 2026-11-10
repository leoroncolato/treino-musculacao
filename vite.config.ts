import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({ persistState: { path: ".cloudflare/state" } }),
  ],
  server: { host: "0.0.0.0" },
});

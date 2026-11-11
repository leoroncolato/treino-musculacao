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
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "ui-vendor",
              test: /node_modules\/(react|react-dom|scheduler|motion|motion-dom|motion-utils|framer-motion)\//,
            },
          ],
        },
      },
    },
  },
});

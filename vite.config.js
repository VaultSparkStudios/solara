import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_APP_BASE_PATH || "/",
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) {
              return "supabase";
            }
            return "vendor";
          }
          if (id.includes("src/components/MenuLorePanels")) {
            return "menu-lore";
          }
          if (id.includes("src/game/content")) {
            return "menu-lore";
          }
          return undefined;
        },
      },
    },
  },
});

import { defineConfig } from "vitest/config";
import path from "node:path";

/* Spieël die "@/*"-alias uit tsconfig.json. Vóór /uit/[sponsor]/route.ts het
   geen toets-lêer 'n "@/"-invoer gebruik nie, dus was hierdie oplossing nog
   nooit nodig nie — die roete (soos die vorige take dit spesifiseer) doen
   egter wel "@/lib/..."-invoere, so vitest moet dit nou self kan oplos. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

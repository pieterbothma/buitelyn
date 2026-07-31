import { defineConfig } from "vitest/config";
import path from "node:path";

/* Spieël die "@/*"-alias uit tsconfig.json (soos web/vitest.config.ts dit
   reeds doen). Vóór actions-sponsor.test.ts het geen admin-toets 'n
   "@/"-invoer benodig nie — hulle het almal relatiewe paaie gebruik — maar
   actions-sponsor.ts self doen "@/lib/supabase/service", so vitest moet dit
   nou self kan oplos om daardie kode te toets. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

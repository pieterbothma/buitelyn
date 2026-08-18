import { defineConfig } from "vitest/config";
import path from "node:path";

/* Vitest het tot nou sonder konfigurasie gewerk omdat elke toets net relatiewe
   invoere gebruik het. Die kaart-renderaar trek egter deur "@/lib/..." heen, so
   die alias moet hier ook opgelos word — anders kan renderKaart en sy
   agtertoe-versoenbare omhulsel glad nie getoets word nie. */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    // Die uitleg-toetse render regte PNG's; dis stadiger as suiwer logika.
    testTimeout: 30_000,
  },
});

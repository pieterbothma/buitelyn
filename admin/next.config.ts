import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* sharp is 'n NATIVE module — dit hoort nie in die bundel nie; Node moet dit
     self met require oplos sodat die regte platform-binêre gekies word.
     Drie roetes voer sharp in: /api/fotos/skep, /api/fotos/oplaai en
     /api/beeld/agtergrond. (Die 500 op die spotprent was primêr twee
     sharp-installasies langs mekaar — npm ci in vercel.json los dít op.) */
  serverExternalPackages: ["sharp"],

  /* Ekstra versekering vir die spotprent-roete: sy bate-lêers (die logo-pad is
     DINAMIES: `logo-${logo}.png`) en sharp se libvips-.so, wat met dlopen —
     nie 'n JS-require nie — gelaai word en dus die lêer-spoorsny ontwyk. */
  outputFileTracingIncludes: {
    "/api/fotos/skep": [
      "./assets/**",
      "./node_modules/@img/sharp-linux-x64/**",
      "./node_modules/@img/sharp-libvips-linux-x64/**",
    ],
  },
};

export default nextConfig;

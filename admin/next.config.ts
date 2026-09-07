import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* sharp moet EKSTERN bly: Turbopack kry nie sy inheemse libvips-.so in die
     bediener-bundel in nie, en /api/fotos/skep val met
     "ERR_DLOPEN_FAILED: libvips-cpp.so ... cannot open shared object file".
     Ekstern → Next se lêer-spoorsny sluit die inheemse binaries self in. */
  serverExternalPackages: ["sharp"],

  /* Die spotprent-roete lees vier bate-lêers met process.cwd()-paaie, en die
     logo-pad is DINAMIES (`logo-${logo}.png`) wat die spoorsny nie kan volg
     nie. Dwing hulle dus in die funksie-bundel in, anders val die komposiet
     ná sharp reggemaak is op 'n ontbrekende font/logo. */
  outputFileTracingIncludes: {
    "/api/fotos/skep": ["./assets/**"],
  },
};

export default nextConfig;

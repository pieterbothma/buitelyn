import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* sharp moet EKSTERN bly: Turbopack kry nie sy inheemse addon in 'n bundel
     in nie, so ons los dit om vanuit node_modules by runtime op te los. */
  serverExternalPackages: ["sharp"],

  outputFileTracingIncludes: {
    "/api/fotos/skep": [
      /* Die spotprent-roete se bate-lêers: die logo-pad is DINAMIES
         (`logo-${logo}.png`) wat die spoorsny nie kan volg nie. */
      "./assets/**",
      /* DIE werklike fout: sharp se .node-addon laai libvips-cpp.so.8.18.3
         met dlopen — 'n OS-vlak-laai, NIE 'n JS-require nie — so Next se
         lêer-spoorsny (en serverExternalPackages) sien dit nooit en dit beland
         nie in die funksie nie → "cannot open shared object file". Dwing die
         inheemse @img-pakkette (bindings + libvips-.so) dus eksplisiet in.
         admin word standalone ontplooi (npm ci in admin/), so ./node_modules is
         die enigste plek; net die linux-binaries bestaan op die bou-masjien. */
      "./node_modules/@img/sharp-linux-x64/**",
      "./node_modules/@img/sharp-libvips-linux-x64/**",
    ],
  },
};

export default nextConfig;

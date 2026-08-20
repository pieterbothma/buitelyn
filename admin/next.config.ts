import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* sharp moet BUITE die bundel bly.
     Next bundel pakkette wat 'n roete invoer, en Turbopack het sharp toe as 'n
     eksterne module probeer laai — met die gevolg dat die native binêre lêer op
     Vercel se linux-x64 nie gevind is nie:

       Could not load the "sharp" module using the linux-x64 runtime
       ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file

     Dit was NIE 'n ontbrekende pakket nie — @img/sharp-linux-x64 en sy libvips
     staan albei in package-lock.json. Die bundelaar het bloot die verkeerde pad
     na die .node-lêer geskryf. serverExternalPackages laat Node dit self met
     require oplos, wat die regte platform-binêre kies.

     Drie roetes hang hiervan af: /api/fotos/skep (die spotprent),
     /api/fotos/oplaai en /api/beeld/agtergrond. */
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

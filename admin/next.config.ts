import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* sharp is 'n NATIVE module — dit hoort nie in die bundel nie; Node moet dit
     self met require oplos sodat die regte platform-binêre gekies word.

     Dit was NIE die oorsaak van die spotprent se 500 nie (sien die commit) —
     dié was twee sharp-installasies langs mekaar. Die reël bly staan omdat dit
     die regte hantering vir 'n native module is, nie omdat dit 'n fout regmaak
     nie. Drie roetes voer sharp in: /api/fotos/skep, /api/fotos/oplaai en
     /api/beeld/agtergrond. */
  serverExternalPackages: ["sharp"],
};

export default nextConfig;

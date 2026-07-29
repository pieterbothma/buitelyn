import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /* Klient-kas vir dinamiese blaaie: oortjie-spring op /markte hergebruik
       'n onlangse render (30s) i.p.v. 'n volle bediener-rondrit elke klik. */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "cdn.substack.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;

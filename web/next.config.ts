import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

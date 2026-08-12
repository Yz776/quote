import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Paksa package native di-resolve via Node.js (bukan di-bundle Turbopack/webpack)
  // agar @resvg/resvg-js & satori jalan di Vercel Lambda.
  serverExternalPackages: [
    "@resvg/resvg-js",
    "@resvg/resvg-js-linux-x64-gnu",
    "satori",
  ],
};

export default nextConfig;

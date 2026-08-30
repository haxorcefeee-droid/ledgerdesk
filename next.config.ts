import type { NextConfig } from "next";

const nextConfig = {
  serverExternalPackages: ["postgres"],
  experimental: {
    nodeMiddleware: true,
  },
} as NextConfig;

export default nextConfig;

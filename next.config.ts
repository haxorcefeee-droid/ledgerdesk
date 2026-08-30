import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  experimental: {
    nodeMiddleware: true,
  },
};

export default nextConfig;

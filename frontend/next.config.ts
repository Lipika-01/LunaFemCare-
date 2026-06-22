import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  // No rewrites needed — all API calls use NEXT_PUBLIC_API_BASE_URL env variable
};


export default nextConfig;

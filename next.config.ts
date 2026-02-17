import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Ensure font files are included in Vercel serverless function bundles
  outputFileTracingIncludes: {
    "/api/talking-head/add-captions": ["./fonts/**/*"],
  },
};

export default nextConfig;

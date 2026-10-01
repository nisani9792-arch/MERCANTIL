import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OpenNext packages this directory into the Cloudflare Worker bundle.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native or Node-only packages stay out of the server bundle.
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "postgres"],
};

export default nextConfig;

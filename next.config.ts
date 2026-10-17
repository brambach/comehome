import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native or Node-only packages stay out of the server bundle.
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "postgres", "@turf/buffer", "@turf/convex", "@turf/helpers"],
};

export default nextConfig;

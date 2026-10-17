import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native or Node-only packages stay out of the server bundle.
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "postgres", "@turf/buffer", "@turf/convex", "@turf/helpers"],
  // Fonts read at runtime by the OG image and the flyer.
  outputFileTracingIncludes: {
    "/p/[slug]/opengraph-image": ["./assets/fonts/**"],
    "/p/[slug]/flyer.pdf": ["./assets/fonts/**"],
  },
};

export default nextConfig;

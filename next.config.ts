import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native or Node-only packages stay out of the server bundle.
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "postgres", "@turf/buffer", "@turf/convex", "@turf/helpers", "@electric-sql/pglite"],
  // Production photos live on Vercel Blob.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // Fonts read at runtime by the OG image and the flyer.
  outputFileTracingIncludes: {
    "/p/[slug]/opengraph-image": ["./assets/fonts/**"],
    "/p/[slug]/flyer.pdf": ["./assets/fonts/**"],
    // The live demo (DEMO=1) migrates an in-memory PGlite on boot.
    "/*": ["./drizzle/**", "./node_modules/@electric-sql/pglite/dist/**"],
  },
};

export default nextConfig;

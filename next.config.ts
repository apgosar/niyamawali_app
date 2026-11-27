import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM packages must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "postgres", "exceljs"],
  // admin photo uploads (donor family photo); the browser shrinks them first, this is the safety margin
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

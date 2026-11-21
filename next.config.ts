import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM packages must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "postgres", "exceljs"],
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

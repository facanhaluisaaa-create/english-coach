import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully session-driven (every page depends on the signed-in learner),
  // so we use the conventional dynamic rendering model rather than Cache Components.
  cacheComponents: false,
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

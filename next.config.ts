import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // web-tree-sitter has .wasm files that need to be excluded from standard bundling
  serverExternalPackages: ["web-tree-sitter"],
  turbopack: {
    // Add path aliases for turbopack if any, though usually tsconfig handles this
    root: path.resolve(__dirname),
  },
};

export default withPWA(nextConfig);

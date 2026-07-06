/**
 * Next.js config — allows Luma CDN images and local dev origins.
 */
import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Required for next/image if we switch cover images to Image component. */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.lumacdn.com" },
      { protocol: "https", hostname: "cdn.lu.ma" },
      { protocol: "https", hostname: "lu.ma" },
      { protocol: "https", hostname: "luma.com" },
      { protocol: "https", hostname: "**.lu.ma" },
      { protocol: "https", hostname: "**.luma.com" },
    ],
  },
};

export default nextConfig;

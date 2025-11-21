import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const resolveBackendTarget = () => {
  const target =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  return target.replace(/\/+$/, "");
};

const nextConfig: NextConfig = {
  turbopack: {
    root: currentDir,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "backend",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s3.konvy.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "thmappbkk.blob.core.windows.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.koreanbeauty.se",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.bioderma.co.th",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.essentials.lk",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cloudinary.images-iherb.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const target = resolveBackendTarget();
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
      // Add this to proxy media files
      {
        source: "/media/:path*",
        destination: `${target}/media/:path*`,
      },
      // If you're also serving static files from Django
      {
        source: "/static/:path*",
        destination: `${target}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;

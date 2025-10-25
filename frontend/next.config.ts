import type { NextConfig } from "next";

const resolveBackendTarget = () => {
  const target =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  return target.replace(/\/+$/, "");
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/media/**',
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

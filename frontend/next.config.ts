import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests from Next.js to Django
  async rewrites() {
    const target = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

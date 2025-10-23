import type { NextConfig } from "next";

const resolveBackendTarget = () => {
  const target =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000";
  return target.replace(/\/+$/, "");
};

const nextConfig: NextConfig = {
  // Proxy API requests from Next.js to Django
  async rewrites() {
    const target = resolveBackendTarget();
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

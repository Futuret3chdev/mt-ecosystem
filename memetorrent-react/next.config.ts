import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2'],
  async redirects() {
    return [
      { source: '/claims.html', destination: '/claims', permanent: true },
    ];
  },
};

export default nextConfig;

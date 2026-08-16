import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2'],
  async redirects() {
    return [
      { source: '/claims.html', destination: '/claims', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/vpn', destination: 'https://admin.futuret3ch.com.au/vpn/' },
      { source: '/vpn/', destination: 'https://admin.futuret3ch.com.au/vpn/' },
      { source: '/vpn/:path*', destination: 'https://admin.futuret3ch.com.au/vpn/:path*' },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/find',
        destination: '/lawyers',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

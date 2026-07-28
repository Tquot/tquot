import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["geist"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "photos.hotelbeds.com" },
      { protocol: "https", hostname: "api.hotelbeds.com" },
      { protocol: "https", hostname: "images.duffel.com" },
      { protocol: "https", hostname: "assets.duffel.com" },
      { protocol: "https", hostname: "cf.bstatic.com" },
      { protocol: "https", hostname: "q-xx.bstatic.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;

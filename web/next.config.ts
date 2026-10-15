import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Player headshots from the EuroLeague media CDNs (750x1000 PNGs, ~550 KB).
    remotePatterns: [
      { protocol: "https", hostname: "media-cdn.incrowdsports.com", port: "", search: "" },
      { protocol: "https", hostname: "media-cdn.cortextech.io", port: "", search: "" },
    ],
    qualities: [75],
    minimumCacheTTL: 30 * 24 * 3600,
    maximumResponseBody: 5_000_000,
    maximumDiskCacheSize: 500_000_000,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Types are checked with `tsc --noEmit` before each build: the check inside
  // `next build` needs over 1 GB of memory, more than this server has.
  typescript: { ignoreBuildErrors: true },
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
  // Predictions is the main page for now; old links still land on it.
  // Temporary (307) so browsers don't remember it if that changes.
  redirects() {
    return [{ source: "/predictions", destination: "/", permanent: false }];
  },
};

export default nextConfig;

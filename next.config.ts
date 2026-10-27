import type { NextConfig } from "next";

// Production builds use the live API unless API_URL overrides it; `next dev` uses the local one.
const API = process.env.API_URL ?? (process.env.NODE_ENV === "production" ? "https://api.yourwault.com" : "http://localhost:4000");

const nextConfig: NextConfig = {
  // Proxy the API so auth cookies stay first-party and no CORS is needed.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/api/:path*` },
      { source: "/storage/:path*", destination: `${API}/storage/:path*` },
    ];
  },
};

export default nextConfig;

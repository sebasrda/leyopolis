import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/books/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Content-Type, Accept-Ranges" },
          { key: "Access-Control-Expose-Headers", value: "Content-Length, Content-Range, Content-Type, Accept-Ranges" },
        ],
      },
    ];
  },
};

export default nextConfig;

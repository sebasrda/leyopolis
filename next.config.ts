import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Tree-shake heavy icon / animation / UI packages so only the symbols we
  // actually use ship to the browser. Dramatic bundle-size win on first paint.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "recharts",
    ],
  },

  // Strip console.log/info/debug in production builds (keep error/warn for ops).
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // Allow Next/Image optimization on Vercel Blob and the placeholder service
  // used as a fallback. Existing <img> tags keep working — this only enables
  // the optimizer when components opt-in via next/image.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },

  async headers() {
    return [
      {
        // PDFs and cover images live here. Names are timestamped so they're
        // effectively immutable — long cache is safe and cuts repeat bandwidth.
        source: "/books/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Content-Type, Accept-Ranges" },
          { key: "Access-Control-Expose-Headers", value: "Content-Length, Content-Range, Content-Type, Accept-Ranges" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Static assets under /public (icons, og images, etc.).
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|otf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Don't bundle pdf-parse / pdfjs-dist / unpdf — they do dynamic requires
  // internally for their worker file that Webpack can't statically analyze.
  // Marking them external makes Next use them straight from node_modules like
  // plain Node modules.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "unpdf"],

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
    // ── Global security headers ─────────────────────────────────────
    // Applied to every response. Camera is allowed because the reader uses
    // MediaPipe HandLandmarker for gesture page-turning.
    const securityHeaders = [
      // Block MIME-sniffing — browser must trust our Content-Type
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Don't let other sites iframe us — prevents clickjacking
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Force HTTPS for 2 years across subdomains; submit to preload list
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      // Don't leak full URL to other origins
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Lock down powerful APIs — only camera (gestures); deny mic, geo, USB, etc.
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
      },
      // Defense-in-depth: prevent the page from being loaded as a different MIME
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // CSP: permissive enough to not break Next/Tailwind/React inline +
      // 3rd-party tooling (pdfjs worker from unpkg, MediaPipe from jsdelivr),
      // strict enough to neutralize most XSS payloads.
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // pdfjs-dist worker is loaded from unpkg.com; MediaPipe Hand
          // Landmarker assets come from cdn.jsdelivr.net. Both are required
          // for the reader and gesture control to work.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://unpkg.com https://cdn.jsdelivr.net https://storage.googleapis.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.googletagmanager.com",
          "script-src-elem 'self' 'unsafe-inline' blob: https://unpkg.com https://cdn.jsdelivr.net https://storage.googleapis.com https://*.vercel-insights.com https://*.vercel-scripts.com https://*.googletagmanager.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https: http:",
          "font-src 'self' data: https://fonts.gstatic.com",
          // PDFs come from Vercel Blob + AI APIs from any HTTPS host
          "connect-src 'self' https: wss: blob:",
          "media-src 'self' blob: https:",
          // pdfjs worker + MediaPipe wasm workers need blob: and the CDNs
          "worker-src 'self' blob: https://unpkg.com https://cdn.jsdelivr.net",
          "frame-src 'self' https://*.youtube.com https://*.vimeo.com",
          "frame-ancestors 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];

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
      {
        // Apply security headers to everything else (pages, API, etc.)
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry: only activates when SENTRY_DSN is set. Otherwise the wrap is a no-op
// for runtime behaviour (it still passes through but reports nothing). Safe
// to leave on permanently.
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export default SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Org/project come from env vars (SENTRY_ORG, SENTRY_PROJECT) so we
      // don't hardcode them — set them in Vercel project settings when ready.
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      sourcemaps: { disable: false },
    })
  : nextConfig;

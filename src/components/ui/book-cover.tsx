"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  children?: React.ReactNode;
  /**
   * If true, image is loaded eagerly with high priority. Use only for the
   * first 4-6 covers above the fold (LCP candidates). Default false → lazy.
   */
  priority?: boolean;
  /**
   * `sizes` hint for the browser. Defaults to a responsive grid card width.
   */
  sizes?: string;
}

const GRADIENTS = [
  "from-indigo-700 via-purple-700 to-pink-700",
  "from-blue-700 via-cyan-600 to-teal-600",
  "from-orange-600 via-amber-600 to-yellow-500",
  "from-green-700 via-emerald-600 to-teal-500",
  "from-rose-700 via-pink-600 to-fuchsia-600",
];

function pickGradient(text: string): string {
  let n = 0;
  for (let i = 0; i < text.length; i++) n += text.charCodeAt(i);
  return GRADIENTS[n % GRADIENTS.length];
}

// Tiny shimmer-style placeholder so the card never shows a blank rectangle.
const SHIMMER_DATA_URI =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 12'>
      <rect width='8' height='12' fill='#1f2433'/>
      <rect x='0.5' y='0.5' width='7' height='11' fill='none' stroke='rgba(255,255,255,0.05)' stroke-width='0.5'/>
    </svg>`
  ).toString("base64");

export function BookCover({
  src,
  alt,
  className,
  aspectRatio = "aspect-[2/3]",
  children,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 240px",
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const gradient = pickGradient(alt);

  return (
    <div className={cn("relative overflow-hidden bg-muted flex items-center justify-center", aspectRatio, className)}>
      <div className="absolute inset-0 w-full h-full bg-[#1A1E2E] opacity-5 pointer-events-none" />

      {failed || !src ? (
        <div className={cn("relative z-10 w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center", gradient)}>
          <span className="text-white/90 text-xs font-bold leading-tight line-clamp-4">{alt}</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          placeholder="blur"
          blurDataURL={SHIMMER_DATA_URI}
          quality={75}
          className="relative z-10 object-contain group-hover:scale-105 transition-transform duration-500 shadow-md"
          onError={() => setFailed(true)}
        />
      )}

      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      {children && <div className="absolute inset-0 z-30">{children}</div>}
    </div>
  );
}

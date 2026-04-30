"use client";

import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface BookCoverProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  children?: React.ReactNode;
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

export function BookCover({
  src,
  alt,
  className,
  aspectRatio = "aspect-[2/3]",
  children,
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const gradient = pickGradient(alt);

  return (
    <div className={cn("relative overflow-hidden bg-muted flex items-center justify-center", aspectRatio, className)}>
      <div className="absolute inset-0 w-full h-full bg-[#1A1E2E] opacity-5 pointer-events-none" />

      {failed ? (
        <div className={cn("relative z-10 w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-3 text-center", gradient)}>
          <span className="text-white/90 text-xs font-bold leading-tight line-clamp-4">{alt}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="relative z-10 max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 shadow-md"
          onError={() => setFailed(true)}
        />
      )}

      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
      {children && <div className="absolute inset-0 z-30">{children}</div>}
    </div>
  );
}

import React from 'react';
import { cn } from "@/lib/utils";

interface BookCoverProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string; // e.g., "aspect-[2/3]"
  children?: React.ReactNode; // For overlays if needed
}

export function BookCover({ 
  src, 
  alt, 
  className, 
  aspectRatio = "aspect-[2/3]", 
  children 
}: BookCoverProps) {
    return (
        <div className={cn("relative overflow-hidden bg-gray-100 flex items-center justify-center", aspectRatio, className)}>
            {/* Fondo sólido simple para portadas que no llenan el aspecto */}
            <div className="absolute inset-0 w-full h-full bg-[#1A1E2E] opacity-5 pointer-events-none" />
            {/* Contained Main Image - ensures the image is shown "completa" as requested */}
            <img 
                src={src} 
                alt={alt} 
                className="relative z-10 max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 shadow-md"
            />
            
            {/* Bottom shadow for visual depth */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
            
            {/* Receptacle for overlays/buttons */}
            {children && <div className="absolute inset-0 z-30">{children}</div>}
        </div>
    );
}

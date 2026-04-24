"use client";

import React from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GestureCamUIProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  statusLabel?: string;
  /** Extra content shown inside the camera window (e.g. dwell bar) */
  children?: React.ReactNode;
}

export function GestureCamUI({
  videoRef, canvasRef, isActive, isLoading, error,
  onStart, onStop, statusLabel, children,
}: GestureCamUIProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Camera window */}
      <div
        className={cn(
          "relative w-52 bg-black rounded-xl overflow-hidden border-2 transition-all duration-500 shadow-xl",
          isActive
            ? "opacity-100 border-purple-500 h-36"
            : "opacity-0 pointer-events-none h-0 border-transparent"
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />
        {/* Live badge */}
        <div className="absolute top-1.5 right-2 flex items-center gap-1 pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse block" />
          <span className="text-[9px] font-bold text-white bg-black/50 px-1 py-0.5 rounded uppercase tracking-wider">
            GESTOS
          </span>
        </div>
        {/* Status label */}
        {statusLabel && isActive && (
          <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/70 rounded px-2 py-1">
            <p className="text-[10px] text-purple-300 font-medium truncate">{statusLabel}</p>
          </div>
        )}
        {children}
      </div>

      {/* Toggle button */}
      <Button
        onClick={isActive ? onStop : onStart}
        disabled={isLoading}
        size="sm"
        className={cn(
          "rounded-full px-4 gap-2 font-bold transition-all",
          isActive
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-purple-700 hover:bg-purple-600 text-white"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isActive ? (
          <><CameraOff className="h-4 w-4" /> Desactivar cámara</>
        ) : (
          <><Camera className="h-4 w-4" /> Activar cámara ✋</>
        )}
      </Button>

      {error && (
        <p className="text-xs text-red-400 text-center max-w-[200px]">{error}</p>
      )}

      {!isActive && !isLoading && (
        <div className="text-center text-xs text-slate-400 space-y-0.5 mt-1">
          <p>🖐 Mano abierta → navegar</p>
          <p>✊ Puño → seleccionar</p>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Camera, CameraOff, Loader2, Crosshair, RotateCcw, Check } from "lucide-react";
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
  /** Optional calibration hooks from useGestureCam */
  onCalibrate?: () => boolean;
  onResetCalibration?: () => void;
  calibrated?: boolean;
}

export function GestureCamUI({
  videoRef, canvasRef, isActive, isLoading, error,
  onStart, onStop, statusLabel, children,
  onCalibrate, onResetCalibration, calibrated,
}: GestureCamUIProps) {
  const [justCalibrated, setJustCalibrated] = useState(false);

  const handleCalibrate = () => {
    if (!onCalibrate) return;
    if (onCalibrate()) {
      setJustCalibrated(true);
      setTimeout(() => setJustCalibrated(false), 1400);
    }
  };

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

      {/* Calibration controls — only visible while the camera is on AND the
          parent passed an onCalibrate handler. Keeps backwards-compat. */}
      {isActive && onCalibrate && (
        <div className="flex items-center gap-1 mt-0.5">
          <Button
            onClick={handleCalibrate}
            size="sm"
            variant="outline"
            title="Pon tu mano en el centro y pulsa para fijar la posición neutra"
            className="h-7 px-2 text-[11px] gap-1 border-purple-500/40 text-purple-200 hover:bg-purple-500/10"
          >
            {justCalibrated ? <Check className="h-3 w-3 text-emerald-400" /> : <Crosshair className="h-3 w-3" />}
            {justCalibrated ? "Listo" : "Calibrar"}
          </Button>
          {calibrated && onResetCalibration && (
            <Button
              onClick={onResetCalibration}
              size="sm"
              variant="ghost"
              title="Volver al mapeo de cámara original"
              className="h-7 px-2 text-[11px] gap-1 text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      )}
      {isActive && onCalibrate && !calibrated && (
        <p className="text-[10px] text-slate-500 text-center max-w-[180px] -mt-0.5">
          Pon tu mano en el centro y pulsa <b>Calibrar</b> si el cursor no responde donde esperas
        </p>
      )}

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

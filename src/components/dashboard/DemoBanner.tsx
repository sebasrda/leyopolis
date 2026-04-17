"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Clock, Mail, X } from "lucide-react";

function formatTimeLeft(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function DemoBanner() {
  const { data: session } = useSession();
  const licenseType = (session?.user as any)?.licenseType;
  const expiresAt = (session?.user as any)?.expiresAt;

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (licenseType !== "DEMO" || !expiresAt) return;

    const updateTimer = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setShowModal(true);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [licenseType, expiresAt]);

  if (licenseType !== "DEMO") return null;
  if (dismissed && timeLeft > 0) return null;

  const expired = timeLeft <= 0;

  return (
    <>
      {/* Banner */}
      <div className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 flex items-center justify-between gap-4 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Clock className="h-4 w-4 shrink-0 animate-pulse" />
          <span className="text-sm font-semibold truncate">
            {expired ? (
              "⚠️ Tu acceso demo ha expirado"
            ) : (
              <>
                <span className="hidden sm:inline">Modo Prueba — acceso limitado · Tu sesión expira en </span>
                <span className="font-mono font-bold text-white bg-black/20 px-2 py-0.5 rounded">
                  {formatTimeLeft(timeLeft)}
                </span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all"
          >
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">Obtener acceso completo</span>
            <span className="sm:hidden">Más info</span>
          </button>
          {!expired && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de contacto */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Quieres acceso completo?</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Tu cuenta actual es de <strong>demostración gratuita</strong> con acceso limitado a 2 lecturas por grado y sin Inteligencia Artificial. Para obtener el plan completo, escríbenos:
              </p>
            </div>
            <a
              href="mailto:consultor.it@gruporodes.com.co"
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-200"
            >
              <Mail className="h-5 w-5" />
              consultor.it@gruporodes.com.co
            </a>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 text-left space-y-1">
              <p className="font-semibold">Con licencia completa obtienes:</p>
              <ul className="list-disc ml-4 space-y-0.5 mt-1">
                <li>Acceso ilimitado a toda la biblioteca</li>
                <li>IA Tutor • Traducción • Diccionario</li>
                <li>Quizzes • Juegos interactivos</li>
                <li>Reportes de progreso avanzados</li>
              </ul>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

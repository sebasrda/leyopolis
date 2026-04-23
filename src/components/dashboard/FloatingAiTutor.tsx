"use client";

import AiTutorWidget from "@/components/reader/AiTutorWidget";
import { Portal } from "@/components/ui/Portal";

export function FloatingAiTutor({ role }: { role: "STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN" }) {
  // Students have NO access to AI
  if (role === "STUDENT") {
    return null;
  }

  return (
    <Portal>
      <div className="fixed bottom-24 left-6 z-[9999]">
        {/* Educational disclaimer */}
        <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 max-w-[280px] shadow-sm">
          ⚠️ Uso exclusivo educativo dentro del aula.
        </div>
        <AiTutorWidget
          mode="general"
          initialMessage={
            role === "TEACHER"
              ? "¡Hola! Soy tu Tutor IA. Puedo ayudarte con planificación de clases, actividades y análisis de estudiantes."
              : role === "ADMIN"
                ? "¡Hola! Soy tu Tutor IA. Puedo ayudarte con gestión, reportes y configuración de la plataforma."
                : "¡Hola! Soy tu Tutor IA. Puedo ayudarte con seguimiento institucional, progreso por grado y reportes."
          }
        />
      </div>
    </Portal>
  );
}

"use client";

import AiTutorWidget from "@/components/reader/AiTutorWidget";
import { Portal } from "@/components/ui/Portal";

export function FloatingAiTutor({ role }: { role: "STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN" }) {
  return (
    <Portal>
      <div className="fixed bottom-24 left-6 z-[9999]">
        <AiTutorWidget
          mode="general"
          initialMessage={
            role === "TEACHER"
              ? "¡Hola! Soy tu Tutor IA. Puedo ayudarte con planificación de clases, actividades y análisis de estudiantes."
              : role === "ADMIN"
                ? "¡Hola! Soy tu Tutor IA. Puedo ayudarte con gestión, reportes y configuración de la plataforma."
                : role === "COORDINATOR"
                  ? "¡Hola! Soy tu Tutor IA. Puedo ayudarte con seguimiento institucional, progreso por grado y reportes."
                : "¡Hola! Soy tu Tutor IA. Puedo ayudarte con lecturas, dudas y tu progreso."
          }
        />
      </div>
    </Portal>
  );
}

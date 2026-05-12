"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  X,
  Sparkles,
  Trophy,
  Flame,
  CalendarRange,
  CheckCircle2,
  Target,
  BookOpen,
} from "lucide-react";
import { LEVEL_THRESHOLDS, MAX_LEVEL } from "@/context/GamificationContext";

interface Section {
  icon: any;
  iconColor: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
  note?: string;
}

const SECTIONS: Section[] = [
  {
    icon: Sparkles,
    iconColor: "text-amber-400",
    title: "¿Cómo ganas XP?",
    rows: [
      { label: "Minuto leído en un libro", value: "+1 XP por minuto" },
      { label: "Página vista del libro", value: "+5 XP" },
      { label: "Quiz aprobado (≥ 70%)", value: "+100 XP" },
      { label: "Quiz perfecto (100%)", value: "+150 XP" },
      { label: "Juego ganado", value: "+50 XP" },
      { label: "Libro completado", value: "+200 XP" },
      { label: "Logro desbloqueado", value: "+25 XP" },
    ],
    note: "El XP se acumula en tu cuenta y nunca baja. Cuanto más leas, más rápido subes.",
  },
  {
    icon: Trophy,
    iconColor: "text-purple-400",
    title: "Sistema de niveles",
    rows: [
      { label: "Nivel mínimo", value: "1 (Principiante)" },
      { label: "Nivel máximo", value: `${MAX_LEVEL} (Inmortal)` },
      { label: "Fórmula del umbral", value: "50 × n × (n+1) XP" },
      { label: "Ejemplo Nivel 10", value: `${LEVEL_THRESHOLDS[9].toLocaleString("es-CO")} XP` },
      { label: "Ejemplo Nivel 25", value: `${LEVEL_THRESHOLDS[24].toLocaleString("es-CO")} XP` },
      { label: "Ejemplo Nivel 50", value: `${LEVEL_THRESHOLDS[49].toLocaleString("es-CO")} XP` },
    ],
    note: "Cada nivel requiere más XP que el anterior. Los títulos cambian cada nivel para que sientas progreso real.",
  },
  {
    icon: CalendarRange,
    iconColor: "text-emerald-400",
    title: "Meta semanal",
    rows: [
      { label: "Días para completarla", value: "7 de 7 días activos" },
      { label: "¿Qué cuenta como día activo?", value: "Cualquier sesión de lectura > 1 min" },
      { label: "¿Cuándo se reinicia?", value: "Cada lunes a las 00:00 (semana ISO)" },
      { label: "Porcentaje mostrado", value: "(días activos / 7) × 100%" },
    ],
    note: "No es lo mismo que la racha. La meta semanal se reinicia automáticamente cada semana — la racha solo se rompe si dejas de leer más de 48h seguidas.",
  },
  {
    icon: Flame,
    iconColor: "text-orange-400",
    title: "Racha (streak)",
    rows: [
      { label: "Cómo subir la racha", value: "Lee al menos 1 min cada día" },
      { label: "Ventana para no perderla", value: "48 horas entre sesiones" },
      { label: "Si pasan > 48 h", value: "La racha se reinicia a 1" },
    ],
    note: "La racha se acumula sin tope. Es señal de constancia, no de cantidad — basta con abrir un libro 5 minutos al día.",
  },
  {
    icon: Target,
    iconColor: "text-indigo-400",
    title: "Porcentaje de comprensión (Quiz)",
    rows: [
      { label: "Cómo se calcula", value: "(respuestas correctas / total) × 100" },
      { label: "Aprobado", value: "≥ 70% por defecto" },
      { label: "Reintentos", value: "Configurable por libro (el profesor decide)" },
      { label: "Pregunta abierta del Quiz Word", value: "No cuenta para el % — la revisa el docente" },
    ],
    note: "Las preguntas de opción múltiple son las que dan el porcentaje. La pregunta de pensamiento crítico (la #11) se entrega aparte.",
  },
  {
    icon: CheckCircle2,
    iconColor: "text-cyan-400",
    title: "Juegos y respuestas correctas",
    rows: [
      { label: "Verdadero o Falso", value: "Muestra la respuesta correcta al fallar" },
      { label: "Quiz gestual", value: "Resalta el cuadrante correcto" },
      { label: "Cronología", value: "Muestra el orden correcto al fallar" },
      { label: "Sopa de Letras", value: "Las palabras se marcan en verde al encontrarlas" },
      { label: "Piedra-Papel-Tijera", value: "Trivia bonus tras cada ronda" },
    ],
  },
  {
    icon: BookOpen,
    iconColor: "text-rose-400",
    title: "Buenas prácticas",
    rows: [
      { label: "Para subir rápido", value: "Lee a diario aunque sea poco" },
      { label: "Para 100% en un libro", value: "Léelo completo y haz el quiz" },
      { label: "Si te bloqueas", value: "Usa el Tutor IA — está incluido" },
      { label: "Si el quiz te sale mal", value: "Repite el libro, releer es válido" },
    ],
  },
];

export default function HelpModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target is only available client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="bg-[#0a0a1a]/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-700 to-purple-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Cómo funciona Leyópolis</h2>
                    <p className="text-xs text-white/70">Guía rápida de puntos, niveles, metas y juegos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full hover:bg-white/15 flex items-center justify-center text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {SECTIONS.map((sec) => (
                  <section
                    key={sec.title}
                    className="bg-white/[0.03] border border-white/5 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <sec.icon className={`h-5 w-5 ${sec.iconColor}`} />
                      <h3 className="font-bold text-white">{sec.title}</h3>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {sec.rows.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-white/5 last:border-0"
                          >
                            <td className="py-1.5 text-slate-300 pr-3">{row.label}</td>
                            <td className="py-1.5 text-right text-white font-semibold tabular-nums">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sec.note && (
                      <p className="mt-3 text-xs text-slate-400 italic leading-relaxed">
                        💡 {sec.note}
                      </p>
                    )}
                  </section>
                ))}
              </div>

              <div className="px-6 py-3 border-t border-white/10 text-center text-[11px] text-slate-500">
                Esta tabla se actualiza automáticamente con los cambios de la plataforma.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Cómo funciona el sistema de puntos"
        className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="hidden md:inline text-sm font-medium">Ayuda</span>
      </button>
      {/* Portal at body level so the modal escapes any ancestor with CSS
          transforms (which would otherwise reparent `position: fixed`). */}
      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

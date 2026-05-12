"use client";

import Hero from "@/components/landing/Hero";
import { BookOpen, Globe, Sparkles, Shield, Zap, BarChart3, Users, GraduationCap, CheckCircle2, Menu, X, Hand, MousePointer2, Camera, Lock, Sparkle } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  {
    icon: Sparkles,
    color: "from-indigo-500 to-purple-600",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/50/20",
    title: "IA Pedagógica",
    desc: "Genera quizzes, juegos y actividades de comprensión automáticamente al subir un libro.",
  },
  {
    icon: Globe,
    color: "from-cyan-500 to-blue-600",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    title: "Traducción en Tiempo Real",
    desc: "Traduce páginas completas y frases seleccionadas directamente en el lector, en +40 idiomas.",
  },
  {
    icon: BarChart3,
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "Analytics en Tiempo Real",
    desc: "Supervisa el progreso de cada estudiante, comprensión promedio y lecturas activas desde tu panel.",
  },
  {
    icon: Shield,
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Control Institucional",
    desc: "Gestiona colegios, clases, docentes y estudiantes con roles diferenciados y permisos seguros.",
  },
  {
    icon: Zap,
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    title: "Gamificación",
    desc: "Sistema de XP, niveles y logros que motiva a los estudiantes a leer más y mejor.",
  },
  {
    icon: BookOpen,
    color: "from-violet-500 to-fuchsia-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "Biblioteca Digital",
    desc: "Carga de PDFs ilimitados con portada, sinopsis IA, filtros por grado y asignación directa.",
  },
];

function DemoSection() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate submission — replace with real API call if needed
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

  return (
    <section id="demo" className="py-32 scroll-mt-20 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>
      <div className="relative container mx-auto px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/50/20 px-4 py-1.5 text-sm font-semibold text-indigo-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            ¿Quieres verlo en acción?
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Solicita tu{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              demo gratuita
            </span>
          </h2>
          <p className="text-gray-400 mb-10">
            Déjanos tu correo y un asesor te contactará para mostrarte todo el potencial de Leyópolis en tu institución.
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">¡Recibido!</p>
              <p className="text-gray-400">Te contactaremos pronto en <span className="text-indigo-300 font-semibold">{email}</span>.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@institución.edu.co"
                className="flex-1 rounded-xl bg-card/5 border border-white/10 text-white placeholder-gray-500 px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50/50 backdrop-blur-sm transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  "Solicitar demo →"
                )}
              </button>
            </form>
          )}

          <p className="mt-4 text-xs text-muted-foreground">Sin compromisos. Respuesta en menos de 24 horas.</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#0a0a1a] text-white">
      {/* NAV */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden">
              <img src="/leyopolis-next.jpg" alt="Leyópolis Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">LEYÓPOLIS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#motion" className="hover:text-white transition-colors flex items-center gap-1">
              <Hand className="h-3.5 w-3.5" /> Motion
            </a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#biblioteca" className="hover:text-white transition-colors">Biblioteca</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2">
              Iniciar sesión
            </a>
            <a
              href="/register"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-200"
            >
              Registrarse →
            </a>
            <button className="md:hidden text-gray-300 hover:text-white p-2" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              {mobileNavOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden bg-[#0f1623] border-t border-white/5 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <a href="#features" className="block text-sm text-gray-300 hover:text-white py-2" onClick={() => setMobileNavOpen(false)}>Características</a>
            <a href="#motion" className="block text-sm text-gray-300 hover:text-white py-2" onClick={() => setMobileNavOpen(false)}>Motion Tracking</a>
            <a href="#demo" className="block text-sm text-gray-300 hover:text-white py-2" onClick={() => setMobileNavOpen(false)}>Demo</a>
            <a href="#biblioteca" className="block text-sm text-gray-300 hover:text-white py-2" onClick={() => setMobileNavOpen(false)}>Biblioteca</a>
            <hr className="border-white/10" />
            <a href="/login" className="block text-sm text-gray-300 hover:text-white py-2">Iniciar sesión</a>
            <a href="/register" className="block text-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white">Registrarse →</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <div className="pt-16">
        <Hero />
      </div>

      {/* SOCIAL PROOF BANNER */}
      <section className="py-16 border-y border-white/5 bg-card/[0.02]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { n: "🔥 Diaria", label: "Sistema de racha · premia leer cada día" },
              { n: "50+", label: "Unidades pedagógicas" },
              { n: "IA 24/7", label: "Tutor disponible" },
              { n: "99.9%", label: "Uptime garantizado" },
            ].map((s) => (
              <div key={s.label}>
        <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {s.n}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-32 scroll-mt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-600/5 blur-[80px]" />
        </div>
        <div className="relative container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/50/20 px-4 py-1.5 text-sm font-semibold text-indigo-300 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Por qué Leyópolis
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Todo lo que tu institución
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                necesita en un lugar
              </span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Desde la carga del libro hasta el análisis de comprensión, Leyópolis cubre todo el ciclo pedagógico con inteligencia artificial integrada.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl ${f.bg} ${f.border} border p-6 hover:bg-card/5 transition-all duration-300 hover:-translate-y-1`}
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} mb-4 shadow-lg`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOTION TRACKING — control sin manos del lector y los juegos */}
      <section id="motion" className="relative py-32 border-t border-white/5 scroll-mt-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/30 px-4 py-1.5 text-sm font-semibold text-purple-300 mb-6">
              <Hand className="h-3.5 w-3.5" />
              Motion Tracking · Powered by IA visual
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Lee y juega{" "}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                sin tocar nada
              </span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              MediaPipe corre directamente en el navegador y reconoce tu mano en tiempo real. Pasa páginas con la mano, selecciona texto con el dedo y juega los minijuegos cerrando el puño — sin instalar nada.
            </p>
          </div>

          {/* Gesture cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                emoji: "🖐",
                icon: Hand,
                gradient: "from-indigo-500 to-purple-600",
                ring: "ring-indigo-500/30",
                title: "Mano abierta",
                desc: "Mueve la mano de un lado al otro frente a la cámara para pasar la página del libro como si fueras un mago.",
              },
              {
                emoji: "☝️",
                icon: MousePointer2,
                gradient: "from-fuchsia-500 to-pink-600",
                ring: "ring-fuchsia-500/30",
                title: "Modo dedo",
                desc: "Estira tu índice y aparece un cursor que sigue la punta. Mantén firme y mueve para resaltar tus frases favoritas.",
              },
              {
                emoji: "✊",
                icon: Sparkle,
                gradient: "from-amber-500 to-orange-600",
                ring: "ring-amber-500/30",
                title: "Cerrar el puño",
                desc: "En los juegos (rompecabezas, V/F, quiz, simón, piedra-papel-tijera) cierras el puño para hacer click — más natural que un mouse.",
              },
              {
                emoji: "✌️",
                icon: Camera,
                gradient: "from-emerald-500 to-teal-600",
                ring: "ring-emerald-500/30",
                title: "Gestos avanzados",
                desc: "Peace, thumbs-up y zonas de pantalla por cuadrantes — la plataforma reconoce más de 6 gestos para distintos modos.",
              },
            ].map((g) => (
              <div
                key={g.title}
                className={`group relative rounded-2xl bg-card/[0.03] border border-white/10 p-6 hover:bg-card/[0.06] transition-all duration-300 hover:-translate-y-1 hover:ring-2 ${g.ring}`}
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${g.gradient} mb-4 shadow-lg text-2xl`}>
                  <span aria-hidden="true">{g.emoji}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <g.icon className="h-4 w-4 text-purple-300" />
                  {g.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>

          {/* Privacy + tech badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">100% en tu navegador</p>
                <p className="text-xs text-gray-400 mt-1">El video nunca sale de tu dispositivo. Cero subidas, cero servidores intermedios.</p>
              </div>
            </div>
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Tiempo real, 30 fps</p>
                <p className="text-xs text-gray-400 mt-1">Detección de mano y gestos a velocidad de cámara, sin lag perceptible.</p>
              </div>
            </div>
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Inclusivo y accesible</p>
                <p className="text-xs text-gray-400 mt-1">Diseñado pensando en estudiantes con limitaciones motoras o que aprenden mejor moviéndose.</p>
              </div>
            </div>
          </div>

          {/* CTA hint */}
          <p className="text-center text-xs text-gray-500 mt-10">
            * Requiere webcam y permiso de cámara. Toda la detección ocurre <span className="text-purple-300 font-semibold">localmente</span> con WebAssembly.
          </p>
        </div>
      </section>

      {/* FOR WHO */}
      <section className="py-32 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Diseñado para{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                cada actor
              </span>{" "}
              educativo
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: GraduationCap,
                role: "Estudiantes",
                color: "from-indigo-500 to-purple-600",
                perks: ["Lee con tutor IA integrado", "Gana XP y sube de nivel", "Completa quizzes automáticos", "Traduce en tiempo real"],
              },
              {
                icon: Users,
                role: "Docentes",
                color: "from-emerald-500 to-teal-600",
                perks: ["Asigna lecturas por curso", "Monitorea comprensión en vivo", "Lecturas sugeridas por IA", "Genera reportes en un clic"],
              },
              {
                icon: Shield,
                role: "Administradores",
                color: "from-amber-500 to-orange-600",
                perks: ["Gestiona toda la institución", "Control de acceso por roles", "Métricas institucionales", "Biblioteca restringida o abierta"],
              },
            ].map((r) => (
              <div
                key={r.role}
                className="rounded-2xl bg-card/[0.03] border border-white/[0.07] p-8 hover:bg-card/[0.06] transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${r.color} mb-6 shadow-xl`}>
                  <r.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">{r.role}</h3>
                <ul className="space-y-3">
                  {r.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <DemoSection />

      {/* FINAL CTA */}
      <section className="py-32 border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl" />
            <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/50/20 p-8 sm:p-16 backdrop-blur-sm">
              <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
                ¿Listo para transformar<br />tu institución?
              </h2>
              <p className="text-gray-400 mb-10 max-w-lg mx-auto">
                Únete a las instituciones que ya usan Leyópolis para empoderar a sus estudiantes con IA educativa de vanguardia.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300"
                >
                  Empezar ahora — Es gratis
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/5 px-8 py-4 text-base font-semibold text-white hover:bg-card/10 transition-all duration-200"
                >
                  Ya tengo cuenta
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img src="/leyopolis-next.jpg" alt="Leyópolis Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-black text-white">LEYÓPOLIS</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 LEYÓPOLIS. Todos los derechos reservados.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="/login" className="hover:text-gray-400 transition-colors">Iniciar sesión</a>
            <a href="/register" className="hover:text-gray-400 transition-colors">Registrarse</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

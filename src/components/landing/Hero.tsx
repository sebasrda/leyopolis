"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, BookOpen, Brain, Globe, Trophy, Star, Zap } from "lucide-react";
import { useState, useEffect } from "react";

const FEATURED_BOOKS = [
  {
    title: "Las Voces del Río",
    author: "S.R.",
    grade: "Séptimo",
    cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1_uH6Nb8piMiAIarFdq2hkQlOQ0fCTLcSHQ&s",
    color: "from-emerald-500 to-teal-700",
  },
  {
    title: "El Mapa de los Mundos Perdidos",
    author: "S.R.",
    grade: "Sexto",
    cover: "https://m.media-amazon.com/images/I/81Q9MeLSqPL._AC_UF1000,1000_QL80_.jpg",
    color: "from-indigo-500 to-purple-700",
  },
  {
    title: "La Casa del Viento",
    author: "S.R.",
    grade: "Sexto",
    cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdSwCNpCvomf2X0Y_A8WXEyT7ZEkidAH8EZg&s",
    color: "from-rose-500 to-pink-700",
  },
  {
    title: "El Código Invisible",
    author: "S.R.",
    grade: "Octavo",
    cover: "https://m.media-amazon.com/images/I/71fajb4AMWL._AC_UF1000,1000_QL80_.jpg",
    color: "from-amber-500 to-orange-700",
  },
];

const STATS = [
  { value: "50+", label: "Unidades", icon: BookOpen },
  { value: "IA", label: "Quizzes Auto", icon: Brain },
  { value: "100%", label: "Pedagógico", icon: Trophy },
];

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a1a]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" />
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-fuchsia-600/15 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* Floating orbs decoration */}
      <div className="absolute top-24 right-[12%] w-3 h-3 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
      <div className="absolute top-40 left-[8%] w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.8s" }} />
      <div className="absolute bottom-32 right-[25%] w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: "1.2s" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-20 lg:flex lg:items-center lg:gap-x-16 lg:px-8 lg:pt-32">
        {/* Left Column */}
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          {/* Badge */}
          <div className="mb-8 flex">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 text-sm font-semibold text-indigo-300 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-indigo-400 fill-indigo-400" />
              Plataforma Educativa con IA · Versión 1.0
              <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            <span className="text-white">La lectura </span>
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                inteligente
              </span>
              <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 opacity-60" />
            </span>
            <br />
            <span className="text-white">para tu </span>
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              institución
            </span>
          </h1>

          <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-xl">
            Leyópolis transforma la lectura en una experiencia <strong className="text-gray-200">gamificada con IA</strong>. Quizzes automáticos, tutores virtuales, seguimiento en tiempo real y biblioteca digital todo-en-uno.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="/register"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Comenzar gratis</span>
              <ArrowRight className="relative h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              Ver demo
            </a>
          </div>

          {/* Stats Row */}
          <div className="mt-14 flex items-center gap-8 flex-wrap">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xl font-black text-white">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-sm text-gray-400">Educadores ya confían</span>
            </div>
          </div>
        </div>

        {/* Right Column — Book Grid */}
        <div className="mx-auto mt-16 lg:mt-0 lg:flex-shrink-0">
          <div className="relative">
            {/* Glow behind grid */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl scale-110" />

            <div className="relative grid grid-cols-2 gap-3 p-3 rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl shadow-2xl">
              {FEATURED_BOOKS.map((book, i) => (
                <a
                  key={book.title}
                  href="/login"
                  className="group relative w-[170px] h-[220px] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(20px)",
                    transition: `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s, box-shadow 0.3s`,
                  }}
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement!;
                      parent.style.background = `linear-gradient(135deg, #4f46e5, #7c3aed)`;
                    }}
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                  {/* Grade badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${book.color} text-white shadow-sm`}>
                      {book.grade}
                    </span>
                  </div>
                  {/* Title at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-xs font-bold leading-tight line-clamp-2">{book.title}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">{book.author}</p>
                  </div>
                </a>
              ))}

              {/* Bottom label */}
              <div className="col-span-2 flex items-center justify-center gap-2 py-1">
                <div className="flex -space-x-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-[#0a0a1a]" />
                  ))}
                </div>
                <span className="text-xs text-gray-500">+50 unidades pedagógicas disponibles</span>
              </div>
            </div>

            {/* Floating feature chips */}
            <div className="absolute -left-8 top-12 hidden lg:flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl px-3 py-2 shadow-xl animate-bounce" style={{ animationDuration: "3s" }}>
              <div className="h-6 w-6 flex items-center justify-center rounded-lg bg-emerald-500/20">
                <Brain className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-300">Quiz generado con IA</p>
                <p className="text-[9px] text-gray-500">En segundos</p>
              </div>
            </div>

            <div className="absolute -right-8 bottom-24 hidden lg:flex items-center gap-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-xl px-3 py-2 shadow-xl animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>
              <div className="h-6 w-6 flex items-center justify-center rounded-lg bg-purple-500/20">
                <Globe className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-purple-300">Traducción en tiempo real</p>
                <p className="text-[9px] text-gray-500">+40 idiomas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

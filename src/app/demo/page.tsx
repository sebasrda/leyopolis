"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Globe, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const demoBooks = [
  {
    id: "isla-del-tesoro",
    title: "La isla del tesoro",
    author: "Robert Louis Stevenson",
    cover: "https://ltmdzlvporv0h72p.public.blob.vercel-storage.com/books/1775527512036-f76ba8919e2df-cover-Captura_de_pantalla_2026-04-06_195549-S1VOh4VtgvdJnrmyYMgdvxeH4ias0o.png",
    pdfUrl: "/books/La_isla_del_tesoro_-_Robert_Louis_Stevenson.pdf",
  },
  {
    id: "vuelta-al-mundo-80-dias",
    title: "La vuelta al mundo en 80 días",
    author: "Julio Verne",
    cover: "https://ltmdzlvporv0h72p.public.blob.vercel-storage.com/books/1775527443333-b2d8922b84d5f-cover-Captura_de_pantalla_2026-04-06_195306-W84AfrG1xGH2GWykK2CS58CNEulzyt.png",
    pdfUrl: "/books/La_vuelta_al_mundo_en_ochenta_dias-Verne_Julio.pdf",
  },
  {
    id: "libro-de-la-selva",
    title: "El libro de la selva",
    author: "Rudyard Kipling",
    cover: "https://ltmdzlvporv0h72p.public.blob.vercel-storage.com/books/1775527375278-d6f200b3c0e6d8-cover-Captura_de_pantalla_2026-04-06_195240-mFRPPYxIGwEkP1IJ5MqBrmvdUblWwh.png",
    pdfUrl: "/books/El_libro_de_la_selva-GrupoRodes.pdf",
  },
  {
    id: "anaconda",
    title: "Anaconda",
    author: "Horacio Quiroga",
    cover: "https://ltmdzlvporv0h72p.public.blob.vercel-storage.com/books/1775527307897-8940850d2bade8-cover-Captura_de_pantalla_2026-04-06_194418-tcGztLDnKK2c1nvjQieiO3EWw1YOl0.png",
    pdfUrl: "/books/anaconda.pdf",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-card">
      <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-indigo-200">LEYOPOLIS</span>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 ml-2">DEMO</Badge>
          </a>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-muted-foreground hover:text-indigo-400">
              Iniciar sesión
            </a>
            <a
              href="/register"
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Registrarse
            </a>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12 space-y-10">
        {/* Demo indicator */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Modo Demo para Ventas</h3>
            <p className="text-sm text-amber-700">
              Esta es una demostración funcional de Leyópolis. El progreso no se guarda ni modifica datos de producción.
              Ideal para mostrar a colegios las capacidades de la plataforma.
            </p>
          </div>
        </div>

        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Demo Funcional — Leyópolis</h1>
          <p className="text-muted-foreground">
            Prueba el lector inteligente, la traducción y el modo bilingüe sin registrarte.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-bold text-foreground">Lector Inteligente IA</h3>
              <p className="text-sm text-muted-foreground">Tutor IA dentro del lector para resolver dudas de la lectura.</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-foreground">Traducción</h3>
              <p className="text-sm text-muted-foreground">Traduce páginas completas y frases seleccionadas en tiempo real.</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-foreground">Quizzes Educativos</h3>
              <p className="text-sm text-muted-foreground">Evaluaciones de comprensión lectora integradas por libro.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Libros Demo</h2>
          <p className="text-sm text-muted-foreground">
            Demo incluye: 1 colegio, 2 clases, 2 docentes, 10 estudiantes de ejemplo.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {demoBooks.map((book) => (
              <Card key={book.id} className="border-none shadow-md overflow-hidden group flex flex-col">
                <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = "none";
                      t.parentElement!.style.background = "linear-gradient(135deg, #4f46e5, #7c3aed)";
                    }}
                  />
                </div>
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-sm line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{book.author}</p>
                  </div>
                  <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs">
                    <a href={`/demo/reader/${book.id}`}>Abrir lector demo</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact section – replaces credentials */}
        <Card className="border-indigo-500/50/30 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="font-bold text-indigo-200 text-lg mb-2">
                ¿Te interesa Leyópolis para tu institución?
              </h3>
              <p className="text-sm text-indigo-300 max-w-lg">
                Escríbenos y con gusto te hacemos una demostración personalizada, resolvemos tus dudas o te
                acompañamos en el proceso de registro para tu colegio.
              </p>
            </div>
            <a
              href="mailto:sebasrda@gmail.com?subject=Inter%C3%A9s%20en%20Ley%C3%B3polis&body=Hola%2C%20me%20gustar%C3%ADa%20obtener%20m%C3%A1s%20informaci%C3%B3n%20sobre%20Ley%C3%B3polis%20para%20mi%20instituci%C3%B3n."
              className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200"
            >
              ✉️ Escribirnos al correo
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

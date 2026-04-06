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
    pdfUrl: "/books/La_isla_del_tesoro_-_Robert_Louis_Stevenson.pdf",
  },
  {
    id: "vuelta-al-mundo-80-dias",
    title: "La vuelta al mundo en 80 días",
    author: "Julio Verne",
    pdfUrl: "/books/La_vuelta_al_mundo_en_ochenta_dias-Verne_Julio.pdf",
  },
  {
    id: "libro-de-la-selva",
    title: "El libro de la selva",
    author: "Rudyard Kipling",
    pdfUrl: "/books/El_libro_de_la_selva-GrupoRodes.pdf",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-indigo-900">LEYOPOLIS</span>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 ml-2">DEMO</Badge>
          </a>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
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
          <h1 className="text-3xl font-bold text-gray-900">Demo Funcional — Leyópolis</h1>
          <p className="text-gray-600">
            Prueba el lector inteligente, la traducción y el modo bilingüe sin registrarte.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900">Lector Inteligente IA</h3>
              <p className="text-sm text-gray-500">Tutor IA dentro del lector para resolver dudas de la lectura.</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900">Traducción</h3>
              <p className="text-sm text-gray-500">Traduce páginas completas y frases seleccionadas en tiempo real.</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900">Quizzes Educativos</h3>
              <p className="text-sm text-gray-500">Evaluaciones de comprensión lectora integradas por libro.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Libros Demo</h2>
          <p className="text-sm text-gray-500">
            Demo incluye: 1 colegio, 2 clases, 2 docentes, 10 estudiantes de ejemplo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demoBooks.map((book) => (
              <Card key={book.id} className="border-none shadow-md overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{book.title}</h3>
                      <p className="text-sm text-gray-500">{book.author}</p>
                    </div>
                    <BookOpen className="h-5 w-5 text-indigo-600 shrink-0" />
                  </div>
                  <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                    <a href={`/demo/reader/${book.id}`}>Abrir lector demo</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Demo credentials */}
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-6">
            <h3 className="font-bold text-indigo-900 mb-3">Credenciales Demo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg border">
                <Badge className="mb-2">Admin</Badge>
                <p>admin@demo.leyopolis.com</p>
                <p className="text-gray-500">demo123</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <Badge variant="secondary" className="mb-2">Docente</Badge>
                <p>docente1@demo.leyopolis.com</p>
                <p className="text-gray-500">demo123</p>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <Badge variant="outline" className="mb-2">Estudiante</Badge>
                <p>estudiante1@demo.leyopolis.com</p>
                <p className="text-gray-500">demo123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

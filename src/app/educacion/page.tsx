"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, PlayCircle, Sparkles } from "lucide-react";

export default function EducacionPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-indigo-900">LEYOPOLIS</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/demo" className="text-sm font-medium text-gray-600 hover:text-indigo-600">
              Demo
            </a>
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
        <div className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Educación</h1>
          <p className="text-gray-600">Cursos, actividades, videos y biblioteca integrados en Leyópolis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Cursos</div>
                <div className="text-sm text-gray-500">Módulos con libros, actividades y videos.</div>
              </div>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                <a href="/dashboard/courses">Entrar</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Actividades</div>
                <div className="text-sm text-gray-500">Cuestionarios y juegos educativos tipo Moodle.</div>
              </div>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                <a href="/dashboard/activities">Entrar</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <PlayCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Videos</div>
                <div className="text-sm text-gray-500">YouTube, Vimeo o enlaces externos.</div>
              </div>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                <a href="/dashboard/videos">Entrar</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Biblioteca</div>
                <div className="text-sm text-gray-500">Explora libros y prueba el lector.</div>
              </div>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                <a href="/biblioteca">Ver biblioteca</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <a href="/demo">Probar demo</a>
          </Button>
          <Button asChild variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
            <a href="/dashboard/teacher">Panel del profesor</a>
          </Button>
        </div>
      </div>
    </main>
  );
}


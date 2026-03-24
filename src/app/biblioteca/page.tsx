"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

const books = [
  {
    id: "isla-del-tesoro",
    title: "La isla del tesoro",
    author: "Robert Louis Stevenson",
  },
  {
    id: "vuelta-al-mundo-80-dias",
    title: "La vuelta al mundo en 80 días",
    author: "Julio Verne",
  },
  {
    id: "libro-de-la-selva",
    title: "El libro de la selva",
    author: "Rudyard Kipling",
  },
];

export default function BibliotecaPage() {
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
              Ver demo
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

      <div className="container mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">Biblioteca</h1>
          <p className="text-gray-600">
            Vista pública para explorar. Para probar el lector, abre los libros en demo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {books.map((b) => (
            <Card key={b.id} className="border-none shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{b.title}</h3>
                    <p className="text-sm text-gray-500">{b.author}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-indigo-600 shrink-0" />
                </div>
                <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                  <a href={`/demo/reader/${b.id}`}>Abrir en demo</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}


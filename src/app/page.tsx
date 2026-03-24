import Hero from "@/components/landing/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Globe, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-indigo-900">LEYÓPOLIS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#caracteristicas" className="hover:text-indigo-600">Características</a>
            <a href="#biblioteca" className="hover:text-indigo-600">Biblioteca</a>
            <a href="#precios" className="hover:text-indigo-600">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600">Iniciar sesión</a>
            <a href="/register" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Registrarse
            </a>
          </div>
        </div>
      </nav>
      <Hero />

      <section id="caracteristicas" className="border-t bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Características</h2>
            <p className="mt-3 text-gray-600">
              Todo lo que ya existe en la plataforma, listo para usarse desde el primer día.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900">Traducción en tiempo real</h3>
                <p className="text-sm text-gray-500">
                  Traduce páginas completas y frases seleccionadas directamente en el lector.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-900">Tutor IA integrado</h3>
                <p className="text-sm text-gray-500">
                  Pregunta por la página actual y recibe apoyo inmediato dentro del lector.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900">Modo bilingüe</h3>
                <p className="text-sm text-gray-500">
                  Visualiza texto original y traducido lado a lado mientras lees.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
              <a href="/demo">Probar demo</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="biblioteca" className="border-t bg-white scroll-mt-20">
        <div className="container mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Biblioteca</h2>
              <p className="mt-3 text-gray-600">
                Explora libros y abre el lector inteligente sin registrarte usando la demo.
              </p>
            </div>
            <Button asChild variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
              <a href="/biblioteca">Ver biblioteca</a>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: "isla-del-tesoro", title: "La isla del tesoro", author: "Robert Louis Stevenson" },
              { id: "vuelta-al-mundo-80-dias", title: "La vuelta al mundo en 80 días", author: "Julio Verne" },
              { id: "libro-de-la-selva", title: "El libro de la selva", author: "Rudyard Kipling" },
            ].map((b) => (
              <Card key={b.id} className="border-none shadow-md overflow-hidden">
                <CardContent className="p-6 space-y-3">
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
      </section>

      <section id="precios" className="border-t bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Precios</h2>
              <p className="mt-3 text-gray-600">
                Planes institucionales listos para colegios, academias y bibliotecas.
              </p>
            </div>
            <Button asChild variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
              <a href="/precios">Ver planes</a>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                name: "Institucional Básico",
                price: "$299/mes",
                items: ["Hasta 500 estudiantes", "Biblioteca completa", "Panel de administración", "Soporte por email"],
              },
              {
                name: "Institucional Pro",
                price: "$599/mes",
                items: ["Estudiantes ilimitados", "Analíticas avanzadas", "Soporte prioritario", "Integraciones"],
              },
            ].map((p) => (
              <Card key={p.name} className="border-none shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <div className="font-bold text-indigo-600">{p.price}</div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500">
                    <a href="/register">Solicitar acceso</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t py-12">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>© 2026 LEYÓPOLIS. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  );
}

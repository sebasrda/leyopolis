"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const plans = [
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
];

export default function PreciosPage() {
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

      <div className="container mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">Precios</h1>
          <p className="text-gray-600">Planes institucionales para implementar Leyópolis en tu organización.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((p) => (
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
    </main>
  );
}


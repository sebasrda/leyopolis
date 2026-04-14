import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const FEATURED_BOOKS = [
  { title: "Las Voces del Rio", cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1_uH6Nb8piMiAIarFdq2hkQlOQ0fCTLcSHQ&s" },
  { title: "El Mapa de los Mundos Perdidos", cover: "https://m.media-amazon.com/images/I/81Q9MeLSqPL._AC_UF1000,1000_QL80_.jpg" },
  { title: "La Casa del Viento", cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdSwCNpCvomf2X0Y_A8WXEyT7ZEkidAH8EZg&s" },
  { title: "El Código Invisible", cover: "https://m.media-amazon.com/images/I/71fajb4AMWL._AC_UF1000,1000_QL80_.jpg" },
];

export default function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <a href="#" className="inline-flex space-x-6">
              <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
                Nuevo: Traducción Completa de Libros
              </span>
              <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
                <span>Versión 1.0 ya disponible</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </span>
            </a>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            LEYÓPOLIS: La Revolución de la Lectura Inteligente
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Aprende idiomas, mejora tu comprensión lectora y traduce libros completos con el poder de la Inteligencia Artificial. La plataforma definitiva para lectores y estudiantes del futuro.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500">
              <a href="/register">Comenzar ahora</a>
            </Button>
            <Button asChild variant="ghost" size="lg" className="flex items-center gap-2">
              <a href="/demo">
                Ver demo <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Book Covers Preview */}
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="-m-2 rounded-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-4 ring-1 ring-inset ring-indigo-200/50">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Unidades Destacadas</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {FEATURED_BOOKS.map((book) => (
                    <a key={book.title} href="/login" className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 w-[160px] h-[210px] block">
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/160x210/6366f1/white?text=${encodeURIComponent(book.title.slice(0,15))}`; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                        <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{book.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Más de 50 unidades disponibles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

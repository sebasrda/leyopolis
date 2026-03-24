import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Globe, Sparkles } from "lucide-react";

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
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="rounded-md bg-white shadow-2xl ring-1 ring-gray-900/10 p-8 min-w-[400px] min-h-[500px] flex flex-col justify-center items-center text-center space-y-6">
                <Sparkles className="h-16 w-16 text-indigo-600" />
                <h3 className="text-2xl font-semibold">Lector Inteligente IA</h3>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-indigo-600"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full text-sm">
                  <div className="p-4 bg-indigo-50 rounded-lg flex flex-col items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-600" />
                    <span>Traducción Real</span>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg flex flex-col items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    <span>Modo Bilingüe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

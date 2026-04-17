import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Licencia Expirada</h1>
        
        <p className="text-gray-600">
          Lo sentimos, pero tu acceso a la plataforma ha expirado. Si estabas utilizando una cuenta de prueba (Demo), tu límite de tiempo se ha agotado.
        </p>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm text-left">
          <strong>¿Qué puedo hacer ahora?</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Contacta al administrador de tu institución.</li>
            <li>Revisa tu correo para información de renovación.</li>
            <li>Adquiere una licencia desde el departamento de coordinación.</li>
            <li>Escríbenos al correo <strong>consultor.it@gruporodes.com.co</strong> para más información.</li>
          </ul>
        </div>

        <div className="pt-4 flex gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="/login">Volver al login</Link>
            </Button>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/">Ir al inicio</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}

import RegisterForm from "@/components/auth/RegisterForm";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="mb-12 flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
          <BookOpen className="text-white h-6 w-6" />
        </div>
        <Link href="/" className="text-3xl font-bold tracking-tight text-indigo-900">LEYÓPOLIS</Link>
      </div>
      <RegisterForm />
      <div className="mt-8 text-sm text-gray-500 flex gap-4">
        <Link href="/privacy" className="hover:text-indigo-600">Privacidad</Link>
        <Link href="/terms" className="hover:text-indigo-600">Términos</Link>
        <Link href="/help" className="hover:text-indigo-600">Ayuda</Link>
      </div>
    </div>
  );
}

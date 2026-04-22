import LoginForm from "@/components/auth/LoginForm";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-indigo-500/10 flex flex-col items-center justify-center p-6">
      <div className="mb-12 flex items-center gap-2">
        <div className="h-12 w-12 rounded-lg bg-card flex items-center justify-center shadow-lg p-1 overflow-hidden">
          <img src="/leyopolis-logo.png" alt="Leyópolis Logo" className="h-full w-full object-contain" />
        </div>
        <Link href="/" className="text-3xl font-bold tracking-tight text-indigo-200">LEYÓPOLIS</Link>
      </div>
      <LoginForm />
      <div className="mt-8 text-sm text-muted-foreground flex gap-4">
        <Link href="/privacy" className="hover:text-indigo-400">Privacidad</Link>
        <Link href="/terms" className="hover:text-indigo-400">Términos</Link>
        <Link href="/help" className="hover:text-indigo-400">Ayuda</Link>
      </div>
    </div>
  );
}

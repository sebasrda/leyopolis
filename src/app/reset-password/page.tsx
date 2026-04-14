"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600 text-center">Enlace inválido o expirado.</p>
        <Link href="/forgot-password" className="text-indigo-600 hover:underline text-sm">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.message || "Error al restablecer.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return done ? (
    <div className="flex flex-col items-center gap-4 py-6">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <p className="text-gray-700 font-semibold text-center">¡Contraseña actualizada!</p>
      <p className="text-gray-500 text-sm text-center">Serás redirigido al inicio de sesión en unos segundos...</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type={showPw ? "text" : "password"}
          placeholder="Nueva contraseña (mín. 6 caracteres)"
          className="pl-10 pr-10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="button" className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="password"
          placeholder="Confirmar contraseña"
          className="pl-10"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-600 mb-4">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <p className="text-sm text-gray-500">LEYÓPOLIS</p>
        </div>
        <Card className="border-none shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
            <CardDescription>Ingresa tu nueva contraseña para recuperar el acceso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

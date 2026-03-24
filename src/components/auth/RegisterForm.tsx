"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, User, GraduationCap, School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegisterForm() {
  const [role, setRole] = useState("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await res.json();
        setError(data.message || "Error al registrar usuario");
      }
    } catch (error) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center text-indigo-900">Crear una cuenta</CardTitle>
        <CardDescription className="text-center">
          Únete a Leyopolis y transforma tu experiencia de lectura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block text-center">Selecciona tu perfil</label>
          <Tabs defaultValue="STUDENT" onValueChange={setRole} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="STUDENT" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Estudiante
              </TabsTrigger>
              <TabsTrigger value="TEACHER" className="flex items-center gap-2">
                <School className="h-4 w-4" /> Profesor
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input name="name" type="text" placeholder="Nombre completo" className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input name="email" type="email" placeholder="correo@ejemplo.com" className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input name="password" type="password" placeholder="Contraseña segura" className="pl-10" required />
            </div>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input name="confirmPassword" type="password" placeholder="Confirmar contraseña" className="pl-10" required />
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Al registrarte, aceptas nuestros <Link href="/terms" className="text-indigo-600">Términos de servicio</Link> y <Link href="/privacy" className="text-indigo-600">Política de privacidad</Link>.
          </p>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-center w-full text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isSuperAdmin = (session?.user as any)?.role === "SUPERADMIN";

  useEffect(() => {
    if (session && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [session, isSuperAdmin, router]);
  const [settings, setSettings] = useState({
    platformName: "LEYÓPOLIS",
    welcomeMessage: "Bienvenido a tu plataforma de lectura inteligente",
    registrationEnabled: "true",
    maintenanceMode: "false",
    GOOGLE_API_KEY: "",
    OPENAI_API_KEY: "",
    OPENROUTER_API_KEY: "",
    ANTHROPIC_API_KEY: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length > 0) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) alert("Configuración guardada");
      else alert("Error al guardar");
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración Global</h1>
        <p className="text-gray-500">Ajustes generales de la plataforma.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Plataforma</CardTitle>
            <CardDescription>Detalles visibles para todos los usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nombre de la Plataforma</Label>
              <Input 
                value={settings.platformName} 
                onChange={(e) => setSettings({...settings, platformName: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Mensaje de Bienvenida</Label>
              <Input 
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({...settings, welcomeMessage: e.target.value})}
              />
            </div>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardContent>
        </Card>

        {/* AI Config — SUPERADMIN ONLY */}
        {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Inteligencia Artificial</CardTitle>
            <CardDescription>Gestiona las llaves de API para la generación de contenido (Quizzes y Juegos).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="openrouter-key">OpenRouter API Key (Recomendado)</Label>
              <Input 
                id="openrouter-key"
                type="password"
                placeholder="sk-or-v1-..."
                value={settings.OPENROUTER_API_KEY}
                onChange={(e) => setSettings({...settings, OPENROUTER_API_KEY: e.target.value})}
              />
              <p className="text-xs text-gray-500 italic">Usado como proveedor principal de alta fiabilidad.</p>
            </div>

            <div className="grid gap-2 pt-2">
              <Label htmlFor="anthropic-key">Anthropic (Claude) API Key</Label>
              <Input 
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-api03-..."
                value={settings.ANTHROPIC_API_KEY}
                onChange={(e) => setSettings({...settings, ANTHROPIC_API_KEY: e.target.value})}
              />
              <p className="text-xs text-gray-500 italic">Claude complementa a las demás IAs para procesamiento de audio y tareas avanzadas de razonamiento.</p>
            </div>
            
            <div className="grid gap-2 pt-2">
              <Label htmlFor="gemini-key">Google Gemini API Key</Label>
              <Input 
                id="gemini-key"
                type="password"
                placeholder="AIzaSy..."
                value={settings.GOOGLE_API_KEY}
                onChange={(e) => setSettings({...settings, GOOGLE_API_KEY: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2 pt-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input 
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={settings.OPENAI_API_KEY}
                onChange={(e) => setSettings({...settings, OPENAI_API_KEY: e.target.value})}
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                {loading ? "Guardando..." : "Guardar Llaves de IA"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades</CardTitle>
            <CardDescription>Activa o desactiva características globales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registro de Usuarios</Label>
                <p className="text-sm text-gray-500">Permitir que nuevos usuarios se registren.</p>
              </div>
              <Switch 
                checked={settings.registrationEnabled === "true"}
                onCheckedChange={(checked) => setSettings({...settings, registrationEnabled: String(checked)})}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Mantenimiento</Label>
                <p className="text-sm text-gray-500">Deshabilitar acceso a usuarios no administradores.</p>
              </div>
              <Switch 
                checked={settings.maintenanceMode === "true"}
                onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: String(checked)})}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

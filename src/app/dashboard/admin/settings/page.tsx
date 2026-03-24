
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: "LEYÓPOLIS",
    welcomeMessage: "Bienvenido a tu plataforma de lectura inteligente",
    registrationEnabled: "true",
    maintenanceMode: "false"
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

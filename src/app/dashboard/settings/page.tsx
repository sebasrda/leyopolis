"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, User as UserIcon } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/users/profile");
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || "",
          email: data.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Cambios guardados con éxito");
      } else {
        alert(data.message || "Error al guardar los cambios");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Error de conexión al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu perfil y experiencia de lectura.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card p-6 shadow-md border-none space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-foreground">Perfil</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nombre completo</Label>
            <Input 
              id="username" 
              placeholder="Tu nombre" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="tu@email.com" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </Card>

        <Card className="bg-card p-6 shadow-md border-none space-y-4">
          <h2 className="text-xl font-bold text-foreground">Preferencias de Lectura</h2>
          <div className="space-y-2">
            <Label htmlFor="font-size">Tamaño de fuente</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Mediano (Próximamente)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeño</SelectItem>
                <SelectItem value="medium">Mediano</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Claro (Próximamente)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="sepia">Sepia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-gray-200 text-muted-foreground cursor-not-allowed font-bold" disabled>
            Aplicar Preferencias
          </Button>
        </Card>
      </div>
    </div>
  );
}

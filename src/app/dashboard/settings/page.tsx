import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Personaliza tu experiencia de lectura.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white p-6 shadow-md border-none space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Perfil</h2>
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input id="username" placeholder="Tu nombre" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" placeholder="tu@email.com" />
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold">Guardar Cambios</Button>
        </Card>

        <Card className="bg-white p-6 shadow-md border-none space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Preferencias de Lectura</h2>
          <div className="space-y-2">
            <Label htmlFor="font-size">Tamaño de fuente</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tamaño" />
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
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="sepia">Sepia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold">Aplicar Preferencias</Button>
        </Card>
      </div>
    </div>
  );
}

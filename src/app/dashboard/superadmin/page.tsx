"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Settings, 
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  CreditCard,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuperAdminDashboard() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState("TRIAL");
  const [maxStudents, setMaxStudents] = useState("30");
  const [duration, setDuration] = useState("30");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch("/api/superadmin/institutions");
      if (res.ok) {
        setInstitutions(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/superadmin/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          domain, 
          plan, 
          maxStudents: parseInt(maxStudents), 
          durationDays: parseInt(duration) 
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        fetchInstitutions();
      } else {
        const error = await res.json();
        alert(error.message || "Error al crear");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "activa": return <Badge className="bg-green-100 text-green-700 border-green-200">Activa</Badge>;
      case "trial": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Trial</Badge>;
      case "vencida": return <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plataforma Leyópolis</h1>
          <p className="text-gray-500">Gestión global de contratos, colegios y suscripciones B2B.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
              <Plus className="h-4 w-4" /> Nuevo Colegio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Colegio</DialogTitle>
              <DialogDescription>Configura la suscripción y límites de la nueva institución.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Institución</Label>
                <Input placeholder="Ej. Colegio San Patricio" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dominio (Identificador único)</Label>
                <Input placeholder="sanpatricio.edu" value={domain} onChange={e => setDomain(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select value={plan} onValueChange={setPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                      <SelectItem value="ANUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Límite Estudiantes</Label>
                  <Input type="number" value={maxStudents} onChange={e => setMaxStudents(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duración del acceso (Días)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={creating || !name || !domain} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Habilitar Institución
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {institutions.map(inst => (
            <Card key={inst.id} className={inst.status === "vencida" ? "border-red-200 bg-red-50/10" : ""}>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-indigo-600" /> {inst.name}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{inst.domain}</p>
                  </div>
                  {getStatusBadge(inst.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Plan</span>
                    <span className="font-semibold">{inst.plan}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Uso</span>
                    <span className="font-semibold">{inst._count?.users || 0} / {inst.maxStudents}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Inicio</span>
                    <span className="font-medium">{new Date(inst.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Fin</span>
                    <span className="font-medium text-red-600">{inst.endDate ? new Date(inst.endDate).toLocaleDateString() : "Ilimitado"}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/superadmin/colegio/${inst.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-semibold gap-2">
                      Entrar al colegio
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {institutions.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No hay colegios registrados aún en la plataforma.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

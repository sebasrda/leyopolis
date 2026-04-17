"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersTab from "./UsersTab";
import ClassesTab from "./ClassesTab";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function InstitutionDashboard({ institutionId }: { institutionId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [togglingLibrary, setTogglingLibrary] = useState(false);

  useEffect(() => {
    fetchData();
  }, [institutionId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLibrary = async (checked: boolean) => {
    setTogglingLibrary(true);
    try {
      const res = await fetch(`/api/superadmin/institutions/${institutionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLibraryRestricted: checked })
      });
      if (res.ok) {
        setData((prev: any) => ({ ...prev, isLibraryRestricted: checked }));
      } else {
        alert("Error al actualizar configuración");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingLibrary(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!data) return <div className="p-8 text-center text-red-500">Colegio no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/superadmin">
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-indigo-600" />
            {data.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{data.domain}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white border rounded-lg p-1 shadow-sm flex flex-wrap gap-1 h-auto justify-start mb-6 w-full max-w-2xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Resumen</TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Estudiantes</TabsTrigger>
          <TabsTrigger value="teachers" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Docentes</TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Administración</TabsTrigger>
          <TabsTrigger value="coordinators" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Coordinadores</TabsTrigger>
          <TabsTrigger value="classes" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Clases</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase">Estado</p>
                  <div className="mt-1">
                    <Badge variant="outline" className="uppercase bg-indigo-50 text-indigo-700 border-indigo-200">{data.status}</Badge>
                  </div>
               </div>
               <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase">Plan Actual</p>
                  <p className="text-lg font-medium mt-1">{data.plan}</p>
               </div>
               <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase">Estudiantes Usados</p>
                  <p className="text-lg font-medium mt-1">
                    <span className="text-indigo-600 font-bold">{data._count?.users || 0}</span> 
                    <span className="text-gray-400"> / {data.maxStudents} límite</span>
                  </p>
               </div>
               <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase">Clases Creadas</p>
                  <p className="text-lg font-medium mt-1">{data._count?.classes || 0}</p>
               </div>
               <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-400 uppercase">Fecha de Ingreso</p>
                  <p className="text-lg font-medium mt-1">{new Date(data.startDate).toLocaleDateString()}</p>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <UsersTab institutionId={institutionId} role="STUDENT" limits={{ count: data._count?.users || 0, max: data.maxStudents }} onUpdate={fetchData} />
        </TabsContent>
        <TabsContent value="teachers">
          <UsersTab institutionId={institutionId} role="TEACHER" limits={{ count: 0, max: 0 }} onUpdate={fetchData} />
        </TabsContent>
        <TabsContent value="admins">
          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle>Configuración de Plataforma / Biblioteca</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Limitar Biblioteca a Unidades Asignadas</h3>
                    <p className="text-sm text-gray-500">
                      Si se activa, los estudiantes de este colegio solo verán en su biblioteca los libros estrictamente asignados a sus clases matriculadas.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {togglingLibrary && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    <Switch checked={data?.isLibraryRestricted || false} onCheckedChange={handleToggleLibrary} disabled={togglingLibrary} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <UsersTab institutionId={institutionId} role="ADMIN" limits={{ count: 0, max: 0 }} onUpdate={fetchData} />
          </div>
        </TabsContent>
        <TabsContent value="coordinators">
          <UsersTab institutionId={institutionId} role="COORDINATOR" limits={{ count: 0, max: 0 }} onUpdate={fetchData} />
        </TabsContent>
        <TabsContent value="classes">
          <ClassesTab institutionId={institutionId} onUpdate={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

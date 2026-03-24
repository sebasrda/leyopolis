
"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function TeacherReportsPage() {
  const [data, setData] = useState<any>({
    completionRate: 0,
    averageTime: "0 min",
    atRisk: 0,
    classPerformance: []
  });

  useEffect(() => {
    fetch("/api/reports")
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes de Progreso</h1>
        <p className="text-gray-500">Analiza el rendimiento de tus estudiantes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Completitud</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Promedio de lecturas finalizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageTime}</div>
            <p className="text-xs text-gray-500 mt-1">Por sesión de lectura</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes en Riesgo</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.atRisk}</div>
            <p className="text-xs text-gray-500 mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Clase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.classPerformance.length > 0 ? (
              data.classPerformance.map((cls: any, i: number) => (
                <div className="space-y-2" key={i}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cls.name}</span>
                    <span className="text-gray-500">{cls.progress}% Completado</span>
                  </div>
                  <Progress value={cls.progress} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay datos de clases disponibles</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

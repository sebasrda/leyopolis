
"use client";

import { 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  CheckCircle2,
  Download,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LicensesPage() {
  const plans = [
    {
      name: "Institucional Básico",
      price: "$299/mes",
      features: ["Hasta 500 estudiantes", "Biblioteca completa", "Panel de administración básico", "Soporte por email"],
      current: false
    },
    {
      name: "Institucional Pro",
      price: "$599/mes",
      features: ["Estudiantes ilimitados", "Biblioteca completa + Premium", "Analíticas avanzadas", "Soporte prioritario 24/7", "API de integración"],
      current: true
    }
  ];

  const invoices = [
    { id: "INV-001", date: "01/03/2026", amount: "$599.00", status: "Pagado" },
    { id: "INV-002", date: "01/02/2026", amount: "$599.00", status: "Pagado" },
    { id: "INV-003", date: "01/01/2026", amount: "$599.00", status: "Pagado" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Licencias y Suscripciones</h1>
          <p className="text-gray-500">Gestiona el plan de tu institución y facturación.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500">
          <CreditCard className="mr-2 h-4 w-4" /> Gestionar Pagos
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.current ? 'border-indigo-600 border-2 shadow-xl' : ''}`}>
            {plan.current && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600">Plan Actual</Badge>
            )}
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {plan.name}
                <span className="text-xl font-bold">{plan.price}</span>
              </CardTitle>
              <CardDescription>Para colegios y universidades</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant={plan.current ? "outline" : "default"} className="w-full">
                {plan.current ? "Configurar Plan" : "Actualizar Plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Descargar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>{inv.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

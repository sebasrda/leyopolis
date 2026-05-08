"use client";

import LicensesPanel from "@/components/dashboard/LicensesPanel";

export default function AdminLicensesPage() {
  return (
    <LicensesPanel
      endpoint="/api/admin/licenses"
      title="Licencias de mi colegio"
      subtitle="Conteo por día, fecha y hora — actualización en tiempo real"
      pollMs={10000}
    />
  );
}

"use client";

import LicensesPanel from "@/components/dashboard/LicensesPanel";

export default function SuperAdminLicensesPage() {
  return (
    <LicensesPanel
      endpoint="/api/superadmin/licenses"
      title="Licencias activas (Global)"
      subtitle="Todas las instituciones · conteo por día, fecha y hora · tiempo real"
      showInstitutionsBreakdown
      pollMs={10000}
    />
  );
}

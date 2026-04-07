import InstitutionDashboard from "./components/InstitutionDashboard";

export default async function ColegioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <InstitutionDashboard institutionId={id} />
    </div>
  );
}

import ClubDetailView from "@/components/dashboard/community/ClubDetailView";

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClubDetailView clubId={id} />;
}

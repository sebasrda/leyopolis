import ClassDetail from "@/components/dashboard/teacher/ClassDetail";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassDetail classId={id} />;
}

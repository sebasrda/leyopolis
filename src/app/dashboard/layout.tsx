import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GamificationProvider } from "@/context/GamificationContext";
import { LearningProvider } from "@/context/LearningContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GamificationProvider>
      <LearningProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </LearningProvider>
    </GamificationProvider>
  );
}

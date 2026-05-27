"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Library, Bot } from "lucide-react";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const FloatingAiTutor = dynamic(
  () => import("@/components/dashboard/FloatingAiTutor").then((m) => m.FloatingAiTutor),
  { ssr: false },
);

type TutorRole = "STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN";

/**
 * Mobile-first bottom navigation strip — inspired by the marketing mockup.
 * Shown on mobile/tablet (hidden on desktop, where the sidebar lives).
 * The center "Leya" button opens the AI tutor as a floating panel; it stays
 * the visual focal point of the bar like the castle icon in the mockup.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tutorOpen, setTutorOpen] = useState(false);
  const sessionRole = (session?.user as any)?.role;
  const tutorRole: TutorRole =
    sessionRole === "TEACHER" || sessionRole === "COORDINATOR" || sessionRole === "ADMIN"
      ? sessionRole
      : "STUDENT";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0a0a1a]/95 backdrop-blur-lg border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 items-end h-16">
          <NavItem href="/dashboard" icon={<Home className="h-5 w-5" />} label="Inicio" active={isActive("/dashboard")} />
          <NavItem href="/dashboard/library?discover=1" icon={<Compass className="h-5 w-5" />} label="Descubrir" />

          {/* Center floating button — Leya AI */}
          <div className="flex justify-center -mt-6">
            <button
              type="button"
              onClick={() => setTutorOpen((v) => !v)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 shadow-2xl shadow-purple-900/50 flex items-center justify-center ring-4 ring-[#0a0a1a] hover:scale-105 transition-transform"
              aria-label="Abrir Leya IA"
            >
              <img src="/leyopolis-next.jpg" alt="Leya" className="h-8 w-8 rounded-full object-cover" />
            </button>
          </div>

          <NavItem href="/dashboard/library" icon={<Library className="h-5 w-5" />} label="Biblioteca" active={isActive("/dashboard/library")} />
          <NavItem
            href="/dashboard/profesor/ai-tools"
            icon={<Bot className="h-5 w-5" />}
            label="IA Leya"
            active={isActive("/dashboard/profesor/ai-tools")}
          />
        </div>
      </nav>

      {tutorOpen && <FloatingAiTutor role={tutorRole} />}
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-indigo-300" : "text-slate-400 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && <span className="block h-1 w-1 rounded-full bg-indigo-400" />}
    </Link>
  );
}

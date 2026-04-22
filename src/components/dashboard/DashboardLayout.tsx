"use client";

import { useEffect, useState } from "react";
import { 
  Building2,
  BookOpen, 
  LayoutDashboard, 
  Library, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Bell,
  Menu,
  ChevronLeft,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Sparkles,
  Bot,
  Crown,
  Flame,
  Target,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import dynamic from 'next/dynamic';
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { DemoBanner } from "@/components/dashboard/DemoBanner";
import { useGamification } from "@/context/GamificationContext";

const FloatingAiTutor = dynamic(() => import("@/components/dashboard/FloatingAiTutor").then((m) => m.FloatingAiTutor), {
  ssr: false,
});

// Student sidebar
const studentItems = [
  { icon: LayoutDashboard, label: "Inicio", href: "/dashboard" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BookOpen, label: "Mis Aventuras", href: "/dashboard/my-readings" },
  { icon: Target, label: "Retos", href: "/dashboard/estudiante" },
  { icon: BarChart3, label: "Progreso", href: "/dashboard/progress" },
  { icon: MessageSquare, label: "Comunidad", href: "/dashboard/community" },
];

// Teacher sidebar
const teacherItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BookOpen, label: "Mis Lecturas", href: "/dashboard/my-readings" },
  { icon: GraduationCap, label: "Profesor", href: "/dashboard/profesor" },
  { icon: Bot, label: "IA Docente", href: "/dashboard/profesor/ai-tools" },
  { icon: Sparkles, label: "Generador Quiz", href: "/dashboard/profesor/generador" },
  { icon: Users, label: "Mis Clases", href: "/dashboard/classes" },
  { icon: BarChart3, label: "Reportes", href: "/dashboard/reports" },
  { icon: MessageSquare, label: "Comunidad", href: "/dashboard/community" },
];

// Coordinator sidebar
const coordinatorItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BarChart3, label: "Coordinador", href: "/dashboard/coordinador" },
  { icon: GraduationCap, label: "Profesor", href: "/dashboard/profesor" },
  { icon: Bot, label: "IA Docente", href: "/dashboard/profesor/ai-tools" },
  { icon: Users, label: "Mis Clases", href: "/dashboard/classes" },
  { icon: BarChart3, label: "Reportes", href: "/dashboard/reports" },
];

// School Admin sidebar
const adminItems = [
  { icon: Building2, label: "Mi Colegio", href: "/dashboard/admin" },
  { icon: Users, label: "Usuarios", href: "/dashboard/admin/users" },
  { icon: GraduationCap, label: "Clases y Docentes", href: "/dashboard/admin/classes" },
  { icon: Library, label: "Biblioteca Local", href: "/dashboard/library" },
];

// Super Admin sidebar
const superAdminItems = [
  { icon: LayoutDashboard, label: "Inicio", href: "/dashboard" },
  { icon: Crown, label: "Súper Admin", href: "/dashboard/superadmin" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BookOpen, label: "Mis Lecturas", href: "/dashboard/my-readings" },
  { icon: Library, label: "Gestión Libros BBDD", href: "/dashboard/admin/books" },
  { icon: Users, label: "Todos los Usuarios", href: "/dashboard/admin/users" },
  { icon: BarChart3, label: "Métricas Reales", href: "/dashboard/admin/stats" },
  { icon: Settings, label: "Plataforma", href: "/dashboard/admin/settings" },
];

// Level name helper
function getLevelName(level: number): string {
  const names: Record<number, string> = {
    1: "Principiante",
    2: "Aprendiz",
    3: "Lector",
    4: "Explorador",
    5: "Aventurero",
    6: "Sabio",
    7: "Explorador",
    8: "Maestro",
    9: "Legendario",
    10: "Leyenda",
  };
  return names[level] || `Nivel ${level}`;
}

// XP thresholds for levels
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stableRole, setStableRole] = useState<"STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN">("STUDENT");
  const role = session?.user?.role || stableRole;
  const [searchQuery, setSearchQuery] = useState("");
  const { progress } = useGamification();

  useEffect(() => {
    const nextRole = session?.user?.role as any;
    if (nextRole && nextRole !== stableRole) {
      setStableRole(nextRole);
    }
  }, [session?.user?.role, stableRole]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/dashboard/library?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Select sidebar items based on role
  let items = studentItems;
  if (role === "SUPERADMIN") {
    items = superAdminItems;
  } else if (role === "ADMIN") {
    items = adminItems;
  } else if (role === "COORDINATOR") {
    items = coordinatorItems;
  } else if (role === "TEACHER") {
    items = teacherItems;
  }

  const isStudent = role === "STUDENT";

  const firstName = session?.user?.name ? session.user.name.split(" ")[0].toLowerCase() : "";
  const isFemale = firstName.endsWith("a");
  const defaultAvatar = isFemale ? "/images/avatars/girl.png" : "/images/avatars/boy.png";

  // XP progress within current level
  const currentLevelXp = LEVEL_THRESHOLDS[Math.min(progress.level - 1, LEVEL_THRESHOLDS.length - 1)] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[Math.min(progress.level, LEVEL_THRESHOLDS.length - 1)] || currentLevelXp + 500;
  const xpInLevel = progress.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const xpPercent = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#0f1623] border-r border-white/5 text-white transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-lg bg-card/10 p-1">
                <img src="/leyopolis-logo.png" alt="Leyópolis Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">LEYÓPOLIS</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white hover:bg-card/10 rounded-lg"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* User Profile Block */}
        {!collapsed && (
          <div className="px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 ring-2 ring-indigo-500/40">
                <AvatarImage src={session?.user?.image || defaultAvatar} />
                <AvatarFallback className="bg-indigo-600 text-white text-sm font-bold">
                  {session?.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {session?.user?.name || "Usuario"}
                </p>
                <p className="text-xs text-slate-400 capitalize">{role.toLowerCase()}</p>
              </div>
            </div>

            {/* Level + XP */}
            <div className="bg-card/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-indigo-300">
                  Nivel {progress.level} · {getLevelName(progress.level)}
                </span>
                <span className="text-xs text-slate-400">{progress.xp} XP</span>
              </div>
              <div className="w-full bg-card/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full transition-all duration-700"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{xpInLevel} / {xpNeeded} XP</span>
                <span className="text-[10px] text-muted-foreground">{xpPercent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed avatar */}
        {collapsed && (
          <div className="px-3 py-3 flex justify-center border-b border-white/5">
            <Avatar className="h-9 w-9 ring-2 ring-indigo-500/40">
              <AvatarImage src={session?.user?.image || defaultAvatar} />
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold">
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href + item.label} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                  isActive
                    ? "bg-[#311A4D] text-[#D8B4FE] border border-[#D8B4FE]/20" 
                    : "text-slate-400 hover:text-white hover:bg-card/5"
                )}
              >
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-[#D8B4FE]" : "text-muted-foreground group-hover:text-slate-300")} style={{ height: '18px', width: '18px' }} />
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                {!collapsed && isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D8B4FE]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-white/5 pt-3">
          {/* Streak Widget (students only) */}
          {isStudent && !collapsed && (
            <div className="mx-0 mb-3 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-3">
              <p className="text-xs text-orange-300/70 font-medium mb-0.5">Racha actual</p>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="text-2xl font-black text-white">{progress.streakDays}</span>
                <span className="text-sm text-orange-300/80 font-medium">días</span>
              </div>
              <p className="text-[10px] text-orange-300/50 mt-1">
                {progress.streakDays >= 7 ? "¡Sigue así, vas increíble!" : "¡No pierdas tu racha!"}
              </p>
            </div>
          )}

          {/* Collapsed streak */}
          {isStudent && collapsed && (
            <div className="flex justify-center mb-2">
              <div className="flex flex-col items-center gap-0.5">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">{progress.streakDays}</span>
              </div>
            </div>
          )}

          <Link 
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-card/5 transition-all",
              pathname === "/dashboard/settings" && "bg-[#311A4D] text-[#D8B4FE] border border-[#D8B4FE]/20"
            )}
          >
            <Settings className="shrink-0" style={{ height: '18px', width: '18px' }} />
            {!collapsed && <span className="font-medium text-sm">Configuración</span>}
          </Link>

          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="shrink-0" style={{ height: '18px', width: '18px' }} />
            {!collapsed && <span className="font-medium text-sm">Cerrar sesión</span>}
          </button>

          {isStudent && !collapsed && (
            <div className="pt-1">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-slate-300 hover:bg-card/5 transition-all text-xs">
                <HelpCircle style={{ height: '15px', width: '15px' }} />
                <span>Centro de Ayuda</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Demo Banner */}
        <DemoBanner />

        {/* Top Bar */}
        <header className="h-16 bg-[#0f1623] border-b border-white/5 px-8 flex items-center justify-between z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar libros, autores, temas..." 
                className="pl-10 bg-card/5 border-white/10 text-slate-300 placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50/50 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {role === "SUPERADMIN" && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/20">
                  ⚡ Súper Admin
                </Badge>
            )}

            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-card/10 rounded-xl">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-[#0f1623]"></span>
            </Button>

            <LanguageSelector />
            
            <div className="h-8 w-px bg-card/10 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-card/10 rounded-xl">
                  <Avatar className="h-8 w-8 ring-2 ring-indigo-500/30">
                    <AvatarImage src={session?.user?.image || defaultAvatar} />
                    <AvatarFallback className={`text-indigo-300 font-bold ${status === "loading" ? "bg-slate-700 animate-pulse" : "bg-indigo-500/20"}`}>
                      {status === "loading" ? "" : (session?.user?.name?.charAt(0) || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    {status === "loading" ? (
                      <div className="flex flex-col gap-1.5 justify-center py-1">
                        <div className="h-3.5 w-24 bg-slate-700 animate-pulse rounded" />
                        <div className="h-2.5 w-16 bg-slate-800 animate-pulse rounded" />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-white">{session?.user?.name || "Usuario"}</p>
                        <p className="text-xs text-slate-400 capitalize">{session?.user?.role?.toLowerCase() || role.toLowerCase()}</p>
                      </>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a2235] border-white/10 text-slate-300">
                <DropdownMenuLabel className="text-slate-400">Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-card/10" />
                <DropdownMenuItem asChild className="hover:bg-card/10 focus:bg-card/10 cursor-pointer">
                  <Link href="/dashboard/settings">Mi Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-card/10 focus:bg-card/10 cursor-pointer">
                  <Link href="/dashboard/progress">Mis Estadísticas</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-card/10" />
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 cursor-pointer"
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#0d1117]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Only show floating AI for non-students, non-demos, and non-reader pages */}
      {!pathname.includes("/reader/") && role !== "STUDENT" && (session?.user as any)?.licenseType !== "DEMO" && (
        <FloatingAiTutor role={role as any} />
      )}
    </div>
  );
}

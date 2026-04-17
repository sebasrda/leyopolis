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
  Crown
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

const FloatingAiTutor = dynamic(() => import("@/components/dashboard/FloatingAiTutor").then((m) => m.FloatingAiTutor), {
  ssr: false,
});

// Student sidebar
const studentItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BookOpen, label: "Mis Lecturas", href: "/dashboard/my-readings" },
  { icon: GraduationCap, label: "Estudiante", href: "/dashboard/estudiante" },
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
  { icon: Settings, label: "Configuración", href: "/dashboard/admin/settings" },
];

// Super Admin sidebar
const superAdminItems = [
  { icon: Crown, label: "Súper Admin", href: "/dashboard/superadmin" },
  { icon: Building2, label: "Colegios", href: "/dashboard/superadmin" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: BookOpen, label: "Mis Lecturas", href: "/dashboard/my-readings" },
  { icon: Library, label: "Gestión Libros BBDD", href: "/dashboard/admin/books" },
  { icon: Users, label: "Todos los Usuarios", href: "/dashboard/admin/users" },
  { icon: BarChart3, label: "Métricas Reales", href: "/dashboard/admin/stats" },
  { icon: Settings, label: "Plataforma", href: "/dashboard/admin/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stableRole, setStableRole] = useState<"STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN" | "SUPERADMIN">("STUDENT");
  const role = session?.user?.role || stableRole;
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-indigo-900 text-white transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-white flex items-center justify-center">
                <span className="text-indigo-900 font-bold text-xl">L</span>
              </div>
              <span className="text-xl font-bold tracking-tight">LEYÓPOLIS</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="text-indigo-200 hover:text-white hover:bg-indigo-800"
          >
            {collapsed ? <Menu /> : <ChevronLeft />}
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link 
              key={item.href + item.label} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                pathname === item.href 
                  ? "bg-indigo-800 text-white shadow-sm" 
                  : "text-indigo-200 hover:text-white hover:bg-indigo-800"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800 space-y-2">
          <Link 
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-800 transition-colors",
              pathname === "/dashboard/settings" && "bg-indigo-800 text-white"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium">Configuración</span>}
          </Link>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-indigo-200 hover:text-white hover:bg-red-900/50 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-medium">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Demo Banner — shown at top for DEMO users */}
        <DemoBanner />

        {/* Top Bar */}}
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between shadow-sm z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar libros, autores, clases..." 
                className="pl-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {role === "SUPERADMIN" && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                  ⚡ Súper Admin
                </Badge>
            )}

            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-indigo-600">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>

            <LanguageSelector />
            
            <div className="h-8 w-px bg-gray-200 mx-2"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-gray-100 rounded-full">
                  <Avatar className="h-8 w-8 ring-2 ring-indigo-50">
                    <AvatarImage src={session?.user?.image || ""} />
                    <AvatarFallback className={`text-indigo-700 font-bold ${status === "loading" ? "bg-gray-200 animate-pulse" : "bg-indigo-100"}`}>
                      {status === "loading" ? "" : (session?.user?.name?.charAt(0) || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    {status === "loading" ? (
                      <div className="flex flex-col gap-1.5 justify-center py-1">
                        <div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded"></div>
                        <div className="h-2.5 w-16 bg-gray-100 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900">{session?.user?.name || "Usuario"}</p>
                        <p className="text-xs text-gray-500 capitalize">{session?.user?.role?.toLowerCase() || role.toLowerCase()}</p>
                      </>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/dashboard/settings">Mi Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/dashboard/progress">Mis Estadísticas</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
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

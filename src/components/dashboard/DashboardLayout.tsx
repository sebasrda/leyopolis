"use client";

import { useEffect, useState } from "react";
import { 
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
  Languages,
  Sparkles
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
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import dynamic from 'next/dynamic';
import { LanguageSelector } from "@/components/i18n/LanguageSelector";

const AiTutorWidget = dynamic(() => import('@/components/reader/AiTutorWidget'), { ssr: false });
const FloatingAiTutor = dynamic(() => import("@/components/dashboard/FloatingAiTutor").then((m) => m.FloatingAiTutor), {
  ssr: false,
});

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Library, label: "Biblioteca", href: "/dashboard/library" },
  { icon: Languages, label: "Traductor IA", href: "/dashboard/translator" },
  { icon: BookOpen, label: "Mis Lecturas", href: "/dashboard/my-readings" },
  { icon: GraduationCap, label: "Aprendizaje", href: "/dashboard/learning" },
  { icon: MessageSquare, label: "Comunidad", href: "/dashboard/community" },
  { icon: BarChart3, label: "Progreso", href: "/dashboard/progress" },
];

const teacherItems = [
  { icon: GraduationCap, label: "Profesor", href: "/dashboard/profesor" },
  { icon: Sparkles, label: "Generador", href: "/dashboard/profesor/generador" },
  { icon: Users, label: "Mis Clases", href: "/dashboard/classes" },
  { icon: BarChart3, label: "Reportes", href: "/dashboard/reports" },
];

const coordinatorItems = [
  { icon: BarChart3, label: "Coordinador", href: "/dashboard/coordinador" },
];

const studentItems = [
  { icon: GraduationCap, label: "Estudiante", href: "/dashboard/estudiante" },
];

const adminItems = [
  { icon: Users, label: "Usuarios", href: "/dashboard/admin/users" },
  { icon: Library, label: "Gestión Libros", href: "/dashboard/admin/books" },
  { icon: BarChart3, label: "Estadísticas", href: "/dashboard/admin/stats" },
  { icon: Settings, label: "Configuración", href: "/dashboard/admin/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [stableRole, setStableRole] = useState<"STUDENT" | "TEACHER" | "COORDINATOR" | "ADMIN">("STUDENT");
  const role = stableRole;
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const nextRole = session?.user?.role;
    if (nextRole) setStableRole(nextRole);
  }, [session?.user?.role]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/dashboard/library?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  let items = sidebarItems;
  if (role === "TEACHER") {
    items = [...sidebarItems, ...teacherItems];
  } else if (role === "COORDINATOR") {
    items = [...sidebarItems, ...coordinatorItems, ...teacherItems];
  } else if (role === "ADMIN") {
    items = adminItems;
  } else {
    items = [...sidebarItems, ...studentItems];
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

        <nav className="flex-1 px-4 py-4 space-y-2">
          {items.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                pathname === item.href 
                  ? "bg-indigo-800 text-white shadow-sm" 
                  : "text-indigo-200 hover:text-white hover:bg-indigo-800"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
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
        {/* Top Bar */}
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
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                      {session?.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900">{session?.user?.name || "Usuario"}</p>
                    <p className="text-xs text-gray-500 capitalize">{role.toLowerCase()}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
                <DropdownMenuItem>Mis Estadísticas</DropdownMenuItem>
                <DropdownMenuItem>Suscripción</DropdownMenuItem>
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
      {!pathname.includes("/reader/") && (
        <FloatingAiTutor role={role} />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Users,
  MessageSquare,
  Search,
  Plus,
  LogIn,
  LogOut,
  BookOpen,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Club {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  membersCount: number;
  postsCount: number;
  isMember: boolean;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const canCreate = ["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(role || "");

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "joined">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCover, setFormCover] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const fetchClubs = async () => {
    try {
      const res = await fetch("/api/community/clubs", { cache: "no-store" });
      if (res.ok) setClubs(await res.json());
    } catch (e) {
      console.error("Error fetching clubs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleJoinToggle = async (clubId: string, isMember: boolean) => {
    // optimistic update
    setClubs((prev) => prev.map((c) =>
      c.id === clubId ? { ...c, isMember: !isMember, membersCount: isMember ? c.membersCount - 1 : c.membersCount + 1 } : c,
    ));
    try {
      await fetch("/api/community/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, action: isMember ? "leave" : "join" }),
      });
    } catch (e) {
      console.error(e);
      fetchClubs(); // revert by refetching truth
    }
  };

  const handleCreate = async () => {
    setFormError(null);
    if (formName.trim().length < 3) {
      setFormError("El nombre debe tener al menos 3 caracteres");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/community/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: formName.trim(),
          description: formDesc.trim(),
          coverImage: formCover.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setFormError(j.message || "No se pudo crear el club");
        return;
      }
      setShowCreate(false);
      setFormName("");
      setFormDesc("");
      setFormCover("");
      fetchClubs();
    } finally {
      setCreating(false);
    }
  };

  const filteredClubs = clubs
    .filter((c) => filter === "joined" ? c.isMember : true)
    .filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const joinedCount = clubs.filter((c) => c.isMember).length;
  const totalPosts = clubs.reduce((sum, c) => sum + c.postsCount, 0);
  const totalMembers = clubs.reduce((sum, c) => sum + c.membersCount, 0);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-400" />
            Comunidad y Clubes
          </h1>
          <p className="text-muted-foreground">Únete a grupos de lectura, comparte ideas y descubre lo que leen otros.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <Plus className="h-4 w-4" /> Crear Club
          </Button>
        )}
      </div>

      {/* ── KPIs ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/85 font-semibold">Clubes activos</p>
              <p className="text-3xl font-black mt-1 tabular-nums">{clubs.length}</p>
            </div>
            <Sparkles className="h-10 w-10 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/85 font-semibold">Tus clubes</p>
              <p className="text-3xl font-black mt-1 tabular-nums">{joinedCount}</p>
            </div>
            <Users className="h-10 w-10 text-white/40" />
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/85 font-semibold">Conversaciones</p>
              <p className="text-3xl font-black mt-1 tabular-nums">{totalPosts}</p>
              <p className="text-[10px] text-white/70 mt-0.5">{totalMembers} miembros en total</p>
            </div>
            <MessageSquare className="h-10 w-10 text-white/40" />
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros + búsqueda ────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar clubes…"
            className="pl-10 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 self-start">
          {([
            ["all", "Todos"],
            ["joined", "Mis clubes"],
          ] as const).map(([k, label]) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setFilter(k)}
              className={`h-8 px-3 text-xs ${filter === k ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Clubs Grid ────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-64 bg-muted border-none" />)}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-border">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium text-foreground">
            {filter === "joined" ? "Aún no perteneces a ningún club" : "No se encontraron clubes"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {filter === "joined" ? "Explora la lista y únete a uno." : "Intenta con otra búsqueda o crea tu propio club."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <Card key={club.id} className="overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-sm flex flex-col h-full bg-[#0f1623]">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                <img
                  src={club.coverImage || "https://placehold.co/400x200?text=Club"}
                  alt={club.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute bottom-4 left-4 z-20 text-white">
                  <h3 className="font-bold text-xl drop-shadow-lg">{club.name}</h3>
                  <div className="flex items-center gap-4 text-xs mt-1 font-medium opacity-90">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {club.membersCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {club.postsCount}
                    </span>
                  </div>
                </div>
                {club.isMember && (
                  <Badge className="absolute top-4 right-4 z-20 bg-emerald-500 hover:bg-emerald-600 shadow-md">
                    Miembro
                  </Badge>
                )}
              </div>

              <CardContent className="flex-1 p-5">
                <p className="text-muted-foreground text-sm line-clamp-3">{club.description}</p>
              </CardContent>

              <CardFooter className="p-5 pt-0 gap-3 border-t border-border bg-muted/20 mt-auto pt-4">
                <Link href={`/dashboard/community/club/${club.id}`} className="flex-1">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <BookOpen className="h-4 w-4 mr-2" /> Entrar
                  </Button>
                </Link>
                <Button
                  variant={club.isMember ? "outline" : "secondary"}
                  size="icon"
                  onClick={() => handleJoinToggle(club.id, club.isMember)}
                  title={club.isMember ? "Salir del club" : "Unirse al club"}
                  className={club.isMember ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30" : "text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"}
                >
                  {club.isMember ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create-club dialog ──────────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="bg-[#0f1623] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Crear nuevo club
              </h2>
              <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Nombre del club *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Club de Lectura de Misterio"
                  maxLength={80}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">Descripción</label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="¿De qué trata? ¿Qué libros leerán?"
                  maxLength={500}
                  className="resize-none min-h-[100px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{formDesc.length}/500</p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 block">URL de portada (opcional)</label>
                <Input
                  value={formCover}
                  onChange={(e) => setFormCover(e.target.value)}
                  placeholder="https://…"
                  type="url"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Si la dejas vacía se genera una imagen con el nombre.</p>
              </div>

              {formError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3">
                  {formError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-2 bg-muted/10">
              <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={creating || formName.trim().length < 3} className="bg-indigo-600 hover:bg-indigo-700">
                {creating ? "Creando…" : "Crear club"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

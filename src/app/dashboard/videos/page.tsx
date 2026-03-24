"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, UploadCloud } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Me = { userId: string; role: "ADMIN" | "TEACHER" | "STUDENT" };

type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  url: string;
  published: boolean;
  createdAt: string;
  teacher: { id: string; name: string | null; email: string | null };
  course: { id: string; title: string } | null;
};

export default function VideosPage() {
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<string>("YOUTUBE");
  const [url, setUrl] = useState("");

  const canCreate = me?.role === "ADMIN" || me?.role === "TEACHER";

  const providerHint = useMemo(() => {
    if (provider === "YOUTUBE") return "Pega un enlace de YouTube";
    if (provider === "VIMEO") return "Pega un enlace de Vimeo";
    return "Pega un enlace directo (mp4/streaming externo)";
  }, [provider]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .catch(() => {});
  }, [session]);

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) setVideos(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchVideos();
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCreate = async () => {
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, provider, url, published: true }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setProvider("YOUTUBE");
      setUrl("");
      setOpen(false);
      fetchVideos();
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-500">Reproducción dentro de la plataforma con enlaces externos.</p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <UploadCloud className="h-4 w-4" /> Agregar video
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Nuevo video</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Título</div>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del video" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Proveedor</div>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YOUTUBE">YouTube</SelectItem>
                        <SelectItem value="VIMEO">Vimeo</SelectItem>
                        <SelectItem value="EXTERNAL">Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Descripción</div>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">URL</div>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={providerHint} />
                  <div className="text-xs text-gray-500">
                    No se suben videos al servidor. Usa enlaces externos o streaming compatible.
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando videos...</CardContent>
        </Card>
      ) : videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">No hay videos disponibles.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((v) => (
            <Card key={v.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{v.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{v.description || "Sin descripción"}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                    {v.provider}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="line-clamp-1">Profesor: {v.teacher.name || v.teacher.email || "—"}</div>
                  <div>{new Date(v.createdAt).toLocaleDateString()}</div>
                </div>
                <Link href={`/dashboard/videos/${v.id}`} className="block">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <PlayCircle className="h-4 w-4" /> Reproducir
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


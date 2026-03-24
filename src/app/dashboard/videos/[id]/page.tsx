"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

type VideoDetail = {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  url: string;
  createdAt: string;
  teacher: { id: string; name: string | null; email: string | null };
  course: { id: string; title: string } | null;
};

function extractYouTubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || "";
    return "";
  } catch {
    return "";
  }
}

function extractVimeoId(url: string) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return "";
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch(`/api/videos/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setVideo(d))
      .finally(() => setLoading(false));
  }, [id, session]);

  const embed = useMemo(() => {
    if (!video) return null;
    if (video.provider === "YOUTUBE") {
      const yid = extractYouTubeId(video.url);
      return yid ? { type: "iframe" as const, src: `https://www.youtube.com/embed/${yid}` } : null;
    }
    if (video.provider === "VIMEO") {
      const vid = extractVimeoId(video.url);
      return vid ? { type: "iframe" as const, src: `https://player.vimeo.com/video/${vid}` } : null;
    }
    return { type: "video" as const, src: video.url };
  }, [video]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/videos">
          <Button variant="ghost" className="gap-2 text-gray-600">
            <ArrowLeft className="h-4 w-4" /> Videos
          </Button>
        </Link>
        {video && (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
            {video.provider}
          </Badge>
        )}
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Cargando video...</CardContent>
        </Card>
      ) : !video ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-gray-500">Video no disponible.</CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{video.title}</CardTitle>
                <CardDescription>{video.description || " "}</CardDescription>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>{video.teacher.name || video.teacher.email || "—"}</div>
                <div>{new Date(video.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full aspect-video bg-black">
              {embed?.type === "iframe" ? (
                <iframe
                  src={embed.src}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={embed?.src} className="w-full h-full" controls />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


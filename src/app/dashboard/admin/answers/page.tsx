"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, Search, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  category?: string;
  grade?: string;
  subject?: string;
  quizId?: string;
}

export default function AdminAnswersIndex() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books");
        if (res.ok) setBooks(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = books.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
            Respuestas de Quizzes y Juegos
          </h1>
          <p className="text-muted-foreground text-sm">
            Vista privada para administradores y docentes. Cada libro muestra las respuestas correctas de su quiz, V/F, cronología y palabras clave.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar libro o autor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No hay libros que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <Link key={b.id} href={`/dashboard/admin/answers/${b.id}`} className="group">
              <Card className="overflow-hidden border-none shadow-md hover:shadow-xl hover:ring-2 hover:ring-indigo-400/40 transition-all flex flex-row h-full">
                <div className="w-20 shrink-0 bg-muted">
                  {b.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col">
                  <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{b.author}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex flex-wrap gap-1">
                      {b.grade && <Badge variant="secondary" className="text-[10px]">{b.grade}</Badge>}
                      {b.subject && <Badge variant="outline" className="text-[10px]">{b.subject}</Badge>}
                      {b.quizId && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <Sparkles className="h-2.5 w-2.5 mr-1" /> Quiz
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-300 transition-colors" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

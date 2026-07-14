"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Languages, Search, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Book {
  id: string;
  title: string;
  author: string;
  grade: string | null;
  hasDescription: boolean;
}

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "Inglés", flag: "🇬🇧" },
  { code: "fr", label: "Francés", flag: "🇫🇷" },
  { code: "de", label: "Alemán", flag: "🇩🇪" },
  { code: "pt", label: "Portugués", flag: "🇧🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "zh", label: "Mandarín", flag: "🇨🇳" },
];

export default function TraducirPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set(["en", "fr", "de", "pt", "it", "zh"]));
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(["title", "description"]));

  // Progress state
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    ok: number;
    skipped: number;
    failed: number;
    current?: { book: string; lang: string; field: string };
    completed?: boolean;
  } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setBooks(
            data.map((b: any) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              grade: b.grade,
              hasDescription: !!b.description && !b.description.startsWith("[Extrayendo"),
            })),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uniqueGrades = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.grade && set.add(b.grade));
    return Array.from(set).sort();
  }, [books]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (gradeFilter && b.grade !== gradeFilter) return false;
      if (q && !b.title.toLowerCase().includes(q) && !b.author?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [books, search, gradeFilter]);

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (filtered.every((b) => selectedBookIds.has(b.id))) {
      setSelectedBookIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedBookIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleField = (f: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const startTranslation = async () => {
    if (selectedBookIds.size === 0 || selectedLangs.size === 0 || selectedFields.size === 0) return;
    setRunning(true);
    setLog([]);
    setProgress({ done: 0, total: 0, ok: 0, skipped: 0, failed: 0 });

    try {
      const res = await fetch("/api/superadmin/translate-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookIds: Array.from(selectedBookIds),
          languages: Array.from(selectedLangs),
          fields: Array.from(selectedFields),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setLog((l) => [...l, `❌ Error: ${err.message || res.statusText}`]);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events: split by \n\n, each starts with "data: "
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // keep the trailing partial event

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (payload.type === "start") {
              setProgress({ done: 0, total: payload.total, ok: 0, skipped: 0, failed: 0 });
              setLog((l) => [...l, `▶ ${payload.message}`]);
            } else if (payload.type === "progress") {
              setProgress({
                done: payload.done,
                total: payload.total,
                ok: payload.ok,
                skipped: payload.skipped,
                failed: payload.failed,
                current: payload.current,
              });
            } else if (payload.type === "complete") {
              setProgress({
                done: payload.done,
                total: payload.total,
                ok: payload.ok,
                skipped: payload.skipped,
                failed: payload.failed,
                completed: true,
              });
              setLog((l) => [...l, `✅ Completado: ${payload.ok} OK · ${payload.skipped} saltadas · ${payload.failed} fallidas`]);
            }
          } catch {
            /* ignore malformed events */
          }
        }
      }
    } catch (e: any) {
      setLog((l) => [...l, `❌ Error de red: ${e?.message || e}`]);
    } finally {
      setRunning(false);
    }
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selectedBookIds.has(b.id));
  const totalOps = selectedBookIds.size * selectedLangs.size * selectedFields.size;

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Languages className="h-8 w-8 text-indigo-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Traducir Unidades en Batch</h1>
          <p className="text-slate-400 text-sm">
            Selecciona libros e idiomas. La API traduce el título y la sinopsis y los cachea en la base de datos —
            todos los usuarios los verán instantáneamente al cambiar de idioma.
          </p>
        </div>
      </div>

      {/* Language + Field selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#0f1623] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Idiomas destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLang(l.code)}
                  disabled={running}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    selectedLangs.has(l.code)
                      ? "bg-indigo-600/20 border-indigo-500 text-white"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1623] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Campos a traducir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10">
                <Checkbox
                  checked={selectedFields.has("title")}
                  onCheckedChange={() => toggleField("title")}
                  disabled={running}
                />
                <div>
                  <p className="text-sm text-white">Título</p>
                  <p className="text-[10px] text-slate-500">Corto, se traduce en segundos</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10">
                <Checkbox
                  checked={selectedFields.has("description")}
                  onCheckedChange={() => toggleField("description")}
                  disabled={running}
                />
                <div>
                  <p className="text-sm text-white">Sinopsis / Descripción</p>
                  <p className="text-[10px] text-slate-500">Puede ser largo (hasta ~500 palabras)</p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Book selector */}
      <Card className="bg-[#0f1623] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              Libros
              <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                {selectedBookIds.size} seleccionados de {filtered.length} visibles
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar título o autor…"
                  className="pl-10 h-9 bg-white/5 border-white/10"
                  disabled={running}
                />
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                disabled={running}
                className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-300"
              >
                <option value="">Todos los grados</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={toggleAllVisible}
                disabled={running || filtered.length === 0}
                className="h-9 border-white/10"
              >
                {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar todos visibles"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-slate-500 py-8">Cargando libros…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Ningún libro coincide con el filtro.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-[420px] overflow-y-auto pr-2">
              {filtered.map((b) => (
                <label
                  key={b.id}
                  className={`flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition ${
                    selectedBookIds.has(b.id)
                      ? "bg-indigo-500/10 border-indigo-500/40"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                  }`}
                >
                  <Checkbox
                    checked={selectedBookIds.has(b.id)}
                    onCheckedChange={() => toggleBook(b.id)}
                    disabled={running}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white line-clamp-1">{b.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {b.author || "—"}
                      {b.grade && <span className="ml-2 bg-white/5 px-1.5 py-0.5 rounded text-slate-400">{b.grade}</span>}
                      {!b.hasDescription && <span className="ml-2 text-amber-400/70">· sin sinopsis</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress & Log */}
      {progress && (
        <Card className="bg-[#0f1623] border-white/10">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                ) : progress.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                )}
                <span className="text-sm font-medium text-white">
                  {progress.done} / {progress.total} operaciones
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400">✓ {progress.ok}</span>
                <span className="text-amber-400">↷ {progress.skipped}</span>
                <span className="text-red-400">✗ {progress.failed}</span>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200"
                style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
              />
            </div>
            {progress.current && (
              <p className="text-[11px] text-slate-500 truncate">
                <span className="text-slate-400 font-medium">{progress.current.lang}</span> ·{" "}
                <span className="text-slate-400">{progress.current.field}</span> ·{" "}
                {progress.current.book}
              </p>
            )}
            {log.length > 0 && (
              <div className="mt-2 border-t border-white/5 pt-3 space-y-1 max-h-32 overflow-y-auto text-[11px] font-mono">
                {log.map((line, i) => (
                  <p key={i} className="text-slate-400">{line}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t border-white/10 bg-[#0a0a1a]/95 backdrop-blur-md p-4 flex items-center justify-between gap-4 flex-wrap z-40">
        <div className="text-sm">
          <span className="text-white font-bold">{totalOps.toLocaleString("es-CO")}</span>
          <span className="text-slate-400"> operaciones de traducción</span>
          <span className="text-[11px] text-slate-500 ml-2">
            = {selectedBookIds.size} libros × {selectedLangs.size} idiomas × {selectedFields.size} campo(s)
          </span>
        </div>
        <Button
          type="button"
          onClick={startTranslation}
          disabled={running || totalOps === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 gap-2 h-11 px-6 shadow-lg shadow-purple-900/30"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Traduciendo…" : `Traducir ${totalOps > 0 ? `(${totalOps})` : ""}`}
        </Button>
      </div>
    </div>
  );
}

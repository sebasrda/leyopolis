"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Languages, Search, CheckCircle2, AlertCircle, Sparkles, BookOpen } from "lucide-react";
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
}

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "en", label: "Inglés", flag: "🇬🇧" },
  { code: "fr", label: "Francés", flag: "🇫🇷" },
  { code: "de", label: "Alemán", flag: "🇩🇪" },
  { code: "pt", label: "Portugués", flag: "🇧🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "zh", label: "Mandarín", flag: "🇨🇳" },
];

interface Progress {
  translated: number;
  cached: number;
  failed: number;
  total: number;
}

export default function TraducirPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [selectedLangs, setSelectedLangs] = useState<Set<string>>(new Set(["en", "fr", "de", "pt", "it", "zh"]));

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [completedSummary, setCompletedSummary] = useState<Progress | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setBooks(data.map((b: any) => ({
            id: b.id, title: b.title, author: b.author, grade: b.grade,
          })));
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

  const toggleBook = (id: string) => setSelectedBookIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAllVisible = () => {
    if (filtered.every((b) => selectedBookIds.has(b.id))) {
      setSelectedBookIds((prev) => { const n = new Set(prev); filtered.forEach((b) => n.delete(b.id)); return n; });
    } else {
      setSelectedBookIds((prev) => { const n = new Set(prev); filtered.forEach((b) => n.add(b.id)); return n; });
    }
  };

  const toggleLang = (code: string) => setSelectedLangs((prev) => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });

  const appendLog = (line: string) => setLog((l) => [...l.slice(-49), line]);

  const startTranslation = async () => {
    if (selectedBookIds.size === 0 || selectedLangs.size === 0) return;
    if (!confirm(`Vas a traducir ${selectedBookIds.size} libro(s) COMPLETOS (todas las páginas del PDF) a ${selectedLangs.size} idioma(s) usando Claude. Esto puede tardar y consumir crédito. ¿Continuar?`)) return;

    setRunning(true);
    setLog([]);
    setCompletedSummary(null);
    setProgress({ translated: 0, cached: 0, failed: 0, total: 0 });
    setCurrentBook(null);

    try {
      const res = await fetch("/api/superadmin/translate-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookIds: Array.from(selectedBookIds),
          languages: Array.from(selectedLangs),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        appendLog(`❌ Error: ${err.message || res.statusText}`);
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

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const p = JSON.parse(line.slice(5).trim());
            switch (p.type) {
              case "start":
                appendLog(`▶ ${p.message}`);
                break;
              case "book-start":
                setCurrentBook(p.book);
                appendLog(`📖 [${p.index}/${p.total}] ${p.book}`);
                break;
              case "book-pages":
                appendLog(`   ${p.validPages} páginas útiles (de ${p.totalPages} totales)`);
                break;
              case "book-skip":
                appendLog(`   ⚠ Saltado: ${p.reason}`);
                break;
              case "book-error":
                appendLog(`   ❌ ${p.error}`);
                break;
              case "book-lang-done":
                appendLog(`   ✓ ${p.lang.toUpperCase()} completado`);
                break;
              case "book-done":
                appendLog(`   ✅ Libro terminado`);
                break;
              case "page-ok":
                if (p.progress) setProgress(p.progress);
                break;
              case "page-cached":
                if (p.progress) setProgress(p.progress);
                break;
              case "page-fail":
                if (p.progress) setProgress(p.progress);
                appendLog(`   ✗ Página ${p.page} (${p.lang}): ${p.error}`);
                break;
              case "complete":
                setCompletedSummary(p.summary);
                appendLog(`\n🎉 Batch completado.`);
                appendLog(`   Traducidas: ${p.summary.translated}`);
                appendLog(`   Ya en cache: ${p.summary.cached}`);
                appendLog(`   Fallidas: ${p.summary.failed}`);
                break;
            }
          } catch {/* ignore */}
        }
      }
    } catch (e: any) {
      appendLog(`❌ Error de red: ${e?.message || e}`);
    } finally {
      setRunning(false);
      setCurrentBook(null);
    }
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selectedBookIds.has(b.id));
  const totalCombos = selectedBookIds.size * selectedLangs.size;
  const pct = progress && progress.total > 0
    ? Math.round(((progress.translated + progress.cached) / progress.total) * 100)
    : 0;

  return (
    <div className="text-white space-y-6 max-w-6xl mx-auto pb-32">
      <div className="flex items-center gap-3">
        <Languages className="h-8 w-8 text-indigo-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Traducir Libros Completos (PDF)</h1>
          <p className="text-slate-400 text-sm mt-1">
            Descarga el PDF de cada libro seleccionado, extrae el texto página por página y lo traduce
            íntegro a los idiomas elegidos usando <strong className="text-indigo-300">Claude Haiku 4.5</strong>.
            Todo queda cacheado — cuando un estudiante abra el libro y cambie idioma, ya lo verá traducido al instante.
          </p>
        </div>
      </div>

      {/* Idiomas */}
      <Card className="bg-[#0f1623] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Idiomas destino</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
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

      {/* Libros */}
      <Card className="bg-[#0f1623] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              Libros a traducir
              <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                {selectedBookIds.size} seleccionados de {filtered.length} visibles
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar título o autor…"
                  className="pl-10 h-9 bg-white/5 border-white/10" disabled={running} />
              </div>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
                disabled={running}
                className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-300">
                <option value="">Todos los grados</option>
                {uniqueGrades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <Button type="button" size="sm" variant="outline"
                onClick={toggleAllVisible} disabled={running || filtered.length === 0}
                className="h-9 border-white/10">
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
                <label key={b.id}
                  className={`flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition ${
                    selectedBookIds.has(b.id)
                      ? "bg-indigo-500/10 border-indigo-500/40"
                      : "bg-white/[0.02] border-white/5 hover:bg-white/5"
                  } ${currentBook === b.title ? "ring-2 ring-amber-400/40" : ""}`}>
                  <Checkbox checked={selectedBookIds.has(b.id)}
                    onCheckedChange={() => toggleBook(b.id)} disabled={running} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white line-clamp-1">{b.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                      {b.author || "—"}
                      {b.grade && <span className="ml-2 bg-white/5 px-1.5 py-0.5 rounded text-slate-400">{b.grade}</span>}
                    </p>
                  </div>
                  {currentBook === b.title && <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progreso */}
      {progress && (
        <Card className="bg-[#0f1623] border-white/10">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  : completedSummary ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <AlertCircle className="h-4 w-4 text-amber-400" />}
                <span className="text-sm font-medium text-white">
                  {progress.translated + progress.cached} / {progress.total} páginas
                  {progress.total > 0 && <span className="text-slate-500 ml-2">({pct}%)</span>}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400">✓ Nuevas {progress.translated}</span>
                <span className="text-cyan-400">⚡ Cache {progress.cached}</span>
                <span className="text-red-400">✗ Fallidas {progress.failed}</span>
              </div>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200"
                style={{ width: `${pct}%` }} />
            </div>
            {currentBook && running && (
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                Procesando: <span className="text-white font-medium">{currentBook}</span>
              </p>
            )}
            {log.length > 0 && (
              <div className="mt-2 border-t border-white/5 pt-3 space-y-0.5 max-h-64 overflow-y-auto text-[11px] font-mono">
                {log.map((line, i) => (
                  <p key={i} className={`whitespace-pre-wrap ${
                    line.includes("❌") ? "text-red-400"
                      : line.includes("✅") || line.includes("🎉") ? "text-emerald-400"
                      : line.includes("⚠") ? "text-amber-400"
                      : line.includes("📖") ? "text-indigo-300"
                      : "text-slate-400"
                  }`}>{line}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t border-white/10 bg-[#0a0a1a]/95 backdrop-blur-md p-4 flex items-center justify-between gap-4 flex-wrap z-40">
        <div className="text-sm">
          <span className="text-white font-bold">{totalCombos}</span>
          <span className="text-slate-400"> combos libro×idioma</span>
          <span className="text-[11px] text-slate-500 ml-2">
            = {selectedBookIds.size} libros × {selectedLangs.size} idiomas · el PDF completo de cada uno
          </span>
        </div>
        <Button type="button" onClick={startTranslation}
          disabled={running || totalCombos === 0}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 gap-2 h-11 px-6 shadow-lg shadow-purple-900/30">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? "Traduciendo…" : `Traducir ${totalCombos > 0 ? `(${totalCombos})` : ""}`}
        </Button>
      </div>
    </div>
  );
}

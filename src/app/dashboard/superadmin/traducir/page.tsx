"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Languages, Search, CheckCircle2, AlertCircle, Sparkles, BookOpen, PlayCircle, RefreshCw } from "lucide-react";
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
  const [currentStatus, setCurrentStatus] = useState<string>(""); // heartbeat
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

  /**
   * Núcleo del batch: acepta las listas ya resueltas (viene del panel superior
   * O del click en un libro de la tabla). No pregunta confirmación aquí — el
   * caller la maneja.
   */
  const runBatch = async (bookIds: string[], languages: string[]) => {
    if (bookIds.length === 0 || languages.length === 0) return;

    setRunning(true);
    setLog([]);
    setCompletedSummary(null);
    setProgress({ translated: 0, cached: 0, failed: 0, total: 0 });
    setCurrentBook(null);

    const totalSummary = { translated: 0, cached: 0, failed: 0, total: 0 };

    // Cada request procesa 1 libro × 1 idioma. Timeout de 3 min es MÁS que
    // suficiente (un libro de 50 páginas con concurrencia 3 termina en 100s
    // en el peor caso). Si se pasa de 3 min, algo se cuelga en Vercel/Claude:
    // abortamos, reintentamos 1 vez, y si sigue mal saltamos al siguiente.
    const REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

    for (let bIdx = 0; bIdx < bookIds.length; bIdx++) {
      const bookId = bookIds[bIdx];
      const book = books.find((b) => b.id === bookId);
      const bookLabel = book?.title || bookId;
      setCurrentBook(bookLabel);
      appendLog(`\n📖 [${bIdx + 1}/${bookIds.length}] ${bookLabel}`);

      for (let lIdx = 0; lIdx < languages.length; lIdx++) {
        const lang = languages[lIdx];
        appendLog(`   🌐 [${lIdx + 1}/${languages.length}] ${lang.toUpperCase()}…`);

        // Función de request con retry. Un request por combo, timeout 3 min.
        const doRequest = async (attempt: number): Promise<{ok: boolean; data?: any; error?: string}> => {
          const controller = new AbortController();
          const started = Date.now();

          // Heartbeat visible en la UI para que el usuario vea que hay actividad
          const heartbeat = setInterval(() => {
            const elapsed = Math.round((Date.now() - started) / 1000);
            setCurrentStatus(`${bookLabel} · ${lang.toUpperCase()} · esperando servidor (${elapsed}s)${attempt > 1 ? ` · intento ${attempt}` : ""}`);
          }, 1000);

          const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          try {
            const res = await fetch("/api/superadmin/translate-books", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookIds: [bookId], languages: [lang] }),
              signal: controller.signal,
            });
            clearTimeout(timer);
            clearInterval(heartbeat);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              return { ok: false, error: `HTTP ${res.status}: ${data?.message || "error"}` };
            }
            return { ok: true, data };
          } catch (e: any) {
            clearTimeout(timer);
            clearInterval(heartbeat);
            if (e?.name === "AbortError") return { ok: false, error: "timeout" };
            return { ok: false, error: e?.message || String(e) };
          }
        };

        let result = await doRequest(1);
        if (!result.ok && result.error === "timeout") {
          appendLog(`      ⏱ Timeout, reintentando…`);
          result = await doRequest(2);
        }

        setCurrentStatus("");

        if (!result.ok) {
          appendLog(`      ❌ ${result.error} — saltando al siguiente`);
          continue;
        }

        const data = result.data;
        totalSummary.translated += data.translated || 0;
        totalSummary.cached += data.cached || 0;
        totalSummary.failed += data.failed || 0;
        totalSummary.total += data.totalPages || 0;

        appendLog(`      ✓ ${data.translated || 0} nuevas, ${data.cached || 0} cache, ${data.failed || 0} fallidas`);
        if (data.firstError) appendLog(`      ⚠ ${data.firstError}`);
        setProgress({ ...totalSummary });
      }
      appendLog(`   ✅ Libro completado`);
    }

    setCompletedSummary(totalSummary as any);
    setProgress(totalSummary);
    appendLog(`\n🎉 Todos los libros procesados.`);
    appendLog(`   Total traducidas: ${totalSummary.translated}`);
    appendLog(`   Ya en cache: ${totalSummary.cached}`);
    appendLog(`   Fallidas: ${totalSummary.failed}`);
    setRunning(false);
    setCurrentBook(null);
    // Refrescar tabla de estado
    fetchStatus();
  };

  // Wrapper para el botón grande del panel superior (con confirmación)
  const startTranslation = async () => {
    if (selectedBookIds.size === 0 || selectedLangs.size === 0) return;
    if (!confirm(`Vas a traducir ${selectedBookIds.size} libro(s) COMPLETOS (todas las páginas del PDF) a ${selectedLangs.size} idioma(s) usando Claude. Esto puede tardar y consumir crédito. ¿Continuar?`)) return;
    await runBatch(Array.from(selectedBookIds), Array.from(selectedLangs));
  };

  // ── Estado global de traducciones (tabla inferior) ─────────────
  interface StatusRow {
    id: string;
    title: string;
    author: string | null;
    grade: string | null;
    coverImage: string | null;
    hasContentUrl: boolean;
    maxPage: number;
    perLang: Record<string, number>;
    total: number;
    expected: number;
    pct: number;
    isComplete: boolean;
    isEmpty: boolean;
    missingLangs: string[];
  }
  interface Status {
    totals: { books: number; complete: number; partial: number; empty: number; translatedPages: number };
    perLang: { lang: string; booksWithAny: number; totalPages: number }[];
    books: StatusRow[];
    languages: string[];
  }
  const [status, setStatus] = useState<Status | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "empty" | "partial" | "complete">("empty");
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/superadmin/translation-status", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const translateOneBook = async (book: StatusRow) => {
    if (running) return;
    // Traducir a TODOS los idiomas que le falten, o a los seleccionados
    // si el usuario ya restringió. Priorizamos los faltantes reales.
    const langsToDo = book.isEmpty
      ? Array.from(selectedLangs).length ? Array.from(selectedLangs) : ["en", "fr", "de", "pt", "it", "zh"]
      : book.missingLangs.map((iso) => {
          // Reverse map ISO → code (pt-BR → pt, zh-CN → zh)
          if (iso === "pt-BR") return "pt";
          if (iso === "zh-CN") return "zh";
          return iso;
        });

    if (langsToDo.length === 0) return;
    if (!confirm(`Traducir "${book.title}" completo a ${langsToDo.length} idioma(s): ${langsToDo.join(", ").toUpperCase()}?`)) return;
    await runBatch([book.id], langsToDo);
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

      {/* Safety notice — the user was worried about wasted tokens on reload */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200 flex gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-300">A prueba de recargas y timeouts</p>
          <p className="text-emerald-200/80 mt-0.5">
            Cada página se guarda en la base de datos apenas Claude la devuelve. Si recargás la página o
            un request se cae, al volver a arrancar simplemente saltamos las páginas ya traducidas (contador ⚡ Cache) —
            <strong> no se re-paga ni un token</strong>. Los libros se procesan uno por idioma, un request por combo,
            así que cada llamada es corta y no toca el timeout de Vercel.
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
            {currentStatus && running && (
              <p className="text-[11px] text-amber-300 flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1 mt-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {currentStatus}
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

      {/* ── ESTADO GLOBAL DE TRADUCCIONES ─────────────────────────── */}
      <Card className="bg-[#0f1623] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              Estado de traducciones
              {status && (
                <>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                    ✓ {status.totals.complete} completos
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                    ⚡ {status.totals.partial} parciales
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-300 border-red-500/30">
                    ⬜ {status.totals.empty} sin traducir
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                    {status.totals.translatedPages.toLocaleString("es-CO")} páginas cacheadas
                  </Badge>
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white/5 border border-white/10 rounded p-0.5 text-[11px]">
                {(["empty", "partial", "complete", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-1 rounded transition ${
                      statusFilter === f
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {f === "empty" ? "Faltan" : f === "partial" ? "Parciales" : f === "complete" ? "Completos" : "Todos"}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={fetchStatus}
                disabled={statusLoading || running}
                className="h-8 border-white/10 gap-1">
                <RefreshCw className={`h-3 w-3 ${statusLoading ? "animate-spin" : ""}`} />
                Refrescar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!status ? (
            <p className="text-slate-500 text-center py-6 text-sm">Cargando estado…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 uppercase tracking-wide">
                    <th className="text-left py-2 pr-2 font-semibold">Libro</th>
                    <th className="text-center px-1 font-semibold">Pág</th>
                    {status.languages.map((l) => (
                      <th key={l} className="text-center px-1 font-semibold">{l.toUpperCase()}</th>
                    ))}
                    <th className="text-center px-2 font-semibold">%</th>
                    <th className="text-right pl-2 pr-1 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {status.books
                    .filter((b) => {
                      if (statusFilter === "empty") return b.isEmpty;
                      if (statusFilter === "partial") return !b.isComplete && !b.isEmpty;
                      if (statusFilter === "complete") return b.isComplete;
                      return true;
                    })
                    .map((b) => (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              b.isComplete ? "bg-emerald-400" : b.isEmpty ? "bg-red-400" : "bg-amber-400"
                            }`} />
                            <span className="text-white line-clamp-1" title={b.title}>{b.title}</span>
                            {b.grade && (
                              <span className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded shrink-0">{b.grade}</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center text-slate-400 px-1 tabular-nums">
                          {b.maxPage || "—"}
                        </td>
                        {status.languages.map((l) => {
                          const n = b.perLang[l] || 0;
                          const full = b.maxPage > 0 && n >= b.maxPage;
                          return (
                            <td key={l} className={`text-center px-1 text-[10px] tabular-nums ${
                              full ? "text-emerald-400" : n > 0 ? "text-amber-400" : "text-slate-600"
                            }`}>
                              {full ? "✓" : n > 0 ? n : "—"}
                            </td>
                          );
                        })}
                        <td className={`text-center px-2 tabular-nums font-semibold ${
                          b.pct >= 100 ? "text-emerald-400" : b.pct >= 50 ? "text-amber-400" : "text-slate-500"
                        }`}>
                          {b.maxPage > 0 ? `${b.pct}%` : "—"}
                        </td>
                        <td className="text-right pl-2 pr-1">
                          {b.isComplete ? (
                            <span className="text-emerald-400 text-[10px]">Listo</span>
                          ) : !b.hasContentUrl ? (
                            <span className="text-slate-600 text-[10px]">Sin PDF</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => translateOneBook(b)}
                              disabled={running}
                              className="h-7 gap-1.5 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-[10px]"
                            >
                              <PlayCircle className="h-3 w-3" />
                              Traducir
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {status.books.filter((b) => {
                if (statusFilter === "empty") return b.isEmpty;
                if (statusFilter === "partial") return !b.isComplete && !b.isEmpty;
                if (statusFilter === "complete") return b.isComplete;
                return true;
              }).length === 0 && (
                <p className="text-center text-slate-500 py-6">Sin libros en este filtro.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

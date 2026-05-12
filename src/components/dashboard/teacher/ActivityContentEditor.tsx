"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, CheckCircle2, XCircle, Pencil, Code2,
} from "lucide-react";

/**
 * Friendly content editor for the "Crear actividad" dialog. Different activity
 * types produce different JSON shapes; this component shows the right form for
 * the selected type and outputs a JSON string via `onChange`.
 *
 * Two modes:
 *   • "visual" — type-aware form (default for teachers)
 *   • "json"   — raw JSON textarea (for power users / admins)
 */
export type ActivityType =
  | "QUIZ"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "SHORT_ANSWER"
  | "WORDSEARCH"
  | "CROSSWORD"
  | "REORDER"
  | "MATCH"
  | "READING_COMPREHENSION";

interface QuizQ { question: string; options: string[]; correctAnswer: number; }
interface TFStmt { text: string; isTrue: boolean; }
interface ReorderS { id: number; sentence: string; }
interface MatchP { word: string; def: string; }
interface FillBlankItem { sentence: string; answer: string; }
interface ShortAnswerItem { question: string; answer: string; }

interface Props {
  type: ActivityType;
  /** Current JSON string. Empty string when nothing has been entered yet. */
  value: string;
  /** Always called with a valid JSON string. */
  onChange: (jsonString: string) => void;
}

export function ActivityContentEditor({ type, value, onChange }: Props) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState(value);
  const [parsed, setParsed] = useState<any>(() => safeParse(value));

  useEffect(() => {
    setJsonText(value);
    setParsed(safeParse(value));
  }, [value, type]);

  // Sync helpers — call after every visual edit
  const emit = (next: any) => {
    setParsed(next);
    const json = JSON.stringify(next, null, 2);
    setJsonText(json);
    onChange(json);
  };

  const handleJsonChange = (txt: string) => {
    setJsonText(txt);
    onChange(txt);
    const p = safeParse(txt);
    if (p) setParsed(p);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex bg-muted/50 rounded-lg p-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode("visual")}
            className={`h-7 px-3 text-xs gap-1 ${mode === "visual" ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
          >
            <Pencil className="h-3 w-3" /> Editor visual
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode("json")}
            className={`h-7 px-3 text-xs gap-1 ${mode === "json" ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
          >
            <Code2 className="h-3 w-3" /> JSON avanzado
          </Button>
        </div>
        <Badge variant="outline" className="bg-muted text-xs">{typeLabel(type)}</Badge>
      </div>

      {mode === "json" ? (
        <Textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={examplePlaceholder(type)}
          className="min-h-[260px] font-mono text-xs"
        />
      ) : (
        <VisualEditor type={type} value={parsed} onChange={emit} />
      )}

      <p className="text-[11px] text-muted-foreground">
        💡 Llena el formulario y al guardar la actividad la plataforma genera el JSON automáticamente. Si prefieres pegar JSON directamente cambia a la pestaña «JSON avanzado».
      </p>
    </div>
  );
}

function safeParse(txt: string): any {
  if (!txt || !txt.trim()) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

function typeLabel(t: ActivityType): string {
  const map: Record<ActivityType, string> = {
    QUIZ: "Cuestionario",
    TRUE_FALSE: "Verdadero / Falso",
    FILL_BLANK: "Completar frase",
    SHORT_ANSWER: "Respuesta corta",
    WORDSEARCH: "Sopa de letras",
    CROSSWORD: "Crucigrama",
    REORDER: "Ordenar palabras",
    MATCH: "Emparejar conceptos",
    READING_COMPREHENSION: "Comprensión lectora",
  };
  return map[t] || t;
}

function examplePlaceholder(t: ActivityType): string {
  const map: Record<ActivityType, string> = {
    QUIZ: `{\n  "questions": [\n    { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0 }\n  ]\n}`,
    TRUE_FALSE: `{\n  "statements": [\n    { "text": "...", "isTrue": true }\n  ]\n}`,
    FILL_BLANK: `{ "sentences": [ { "sentence": "El cielo es ___", "answer": "azul" } ] }`,
    SHORT_ANSWER: `{ "questions": [ { "question": "...", "answer": "..." } ] }`,
    WORDSEARCH: `{ "words": [ "LIBRO", "LECTURA" ], "gridSize": 12 }`,
    CROSSWORD: `{ "clues": [ { "word": "LIBRO", "hint": "..." } ] }`,
    REORDER: `{ "sentences": [ { "id": 1, "sentence": "..." } ] }`,
    MATCH: `{ "pairs": [ { "word": "...", "def": "..." } ] }`,
    READING_COMPREHENSION: `{ "passage": "...", "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0 } ] }`,
  };
  return map[t] || "";
}

// ── Visual editors per type ─────────────────────────────────────────────────

function VisualEditor({ type, value, onChange }: { type: ActivityType; value: any; onChange: (v: any) => void }) {
  switch (type) {
    case "QUIZ":
    case "READING_COMPREHENSION":
      return <QuizEditor value={value} onChange={onChange} includePassage={type === "READING_COMPREHENSION"} />;
    case "TRUE_FALSE":
      return <TrueFalseEditor value={value} onChange={onChange} />;
    case "FILL_BLANK":
      return <FillBlankEditor value={value} onChange={onChange} />;
    case "SHORT_ANSWER":
      return <ShortAnswerEditor value={value} onChange={onChange} />;
    case "WORDSEARCH":
    case "CROSSWORD":
      return <WordsEditor type={type} value={value} onChange={onChange} />;
    case "REORDER":
      return <ReorderEditor value={value} onChange={onChange} />;
    case "MATCH":
      return <MatchEditor value={value} onChange={onChange} />;
    default:
      return (
        <p className="text-sm text-muted-foreground italic">
          Este tipo no tiene editor visual aún — usa la pestaña «JSON avanzado».
        </p>
      );
  }
}

// ── QUIZ / READING_COMPREHENSION ──
function QuizEditor({ value, onChange, includePassage }: { value: any; onChange: (v: any) => void; includePassage?: boolean }) {
  const passage: string = value?.passage || "";
  const questions: QuizQ[] = Array.isArray(value?.questions) && value.questions.length > 0
    ? value.questions
    : [{ question: "", options: ["", "", "", ""], correctAnswer: 0 }];

  const update = (next: QuizQ[]) => {
    onChange(includePassage ? { passage, questions: next } : { questions: next });
  };
  const updatePassage = (p: string) => {
    onChange({ passage: p, questions });
  };

  return (
    <div className="space-y-4">
      {includePassage && (
        <div className="space-y-1">
          <Label>Texto base de comprensión lectora</Label>
          <Textarea
            value={passage}
            onChange={(e) => updatePassage(e.target.value)}
            placeholder="Pega aquí el texto que los estudiantes leerán antes de responder."
            className="min-h-[120px]"
          />
        </div>
      )}
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-3 space-y-2 bg-card/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pregunta {i + 1}</span>
            {questions.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-400 hover:text-red-600" onClick={() => update(questions.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3 mr-1" /> Quitar
              </Button>
            )}
          </div>
          <Input
            value={q.question}
            onChange={(e) => update(questions.map((x, j) => j === i ? { ...x, question: e.target.value } : x))}
            placeholder="Escribe la pregunta"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((j) => (
              <label key={j} className={`flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer ${q.correctAnswer === j ? "border-emerald-500 bg-emerald-500/10" : "border-border/40"}`}>
                <input
                  type="radio"
                  name={`q-${i}-correct`}
                  checked={q.correctAnswer === j}
                  onChange={() => update(questions.map((x, k) => k === i ? { ...x, correctAnswer: j } : x))}
                />
                <span className="font-mono text-xs w-4">{String.fromCharCode(65 + j)}.</span>
                <Input
                  value={q.options?.[j] ?? ""}
                  onChange={(e) => update(questions.map((x, k) => {
                    if (k !== i) return x;
                    const nextOpts = [...(x.options || ["", "", "", ""])];
                    while (nextOpts.length < 4) nextOpts.push("");
                    nextOpts[j] = e.target.value;
                    return { ...x, options: nextOpts };
                  }))}
                  placeholder={`Opción ${String.fromCharCode(65 + j)}`}
                  className="border-0 bg-transparent px-1 h-7"
                />
                {q.correctAnswer === j && <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto shrink-0" />}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Marca la opción correcta con el radio button. La opción resaltada en verde es la respuesta válida.
          </p>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }])}>
        <Plus className="h-3 w-3" /> Agregar pregunta
      </Button>
    </div>
  );
}

// ── TRUE_FALSE ──
function TrueFalseEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const items: TFStmt[] = Array.isArray(value?.statements) && value.statements.length > 0
    ? value.statements
    : [{ text: "", isTrue: true }];

  const update = (next: TFStmt[]) => onChange({ statements: next });

  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-3 bg-card/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Afirmación {i + 1}</span>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-400" onClick={() => update(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Textarea
            value={s.text}
            onChange={(e) => update(items.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
            placeholder="Escribe la afirmación que el estudiante debe juzgar"
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={s.isTrue ? "default" : "outline"}
              className={s.isTrue ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1" : "gap-1"}
              onClick={() => update(items.map((x, j) => j === i ? { ...x, isTrue: true } : x))}
            >
              <CheckCircle2 className="h-3 w-3" /> Verdadero
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!s.isTrue ? "default" : "outline"}
              className={!s.isTrue ? "bg-red-600 hover:bg-red-700 text-white gap-1" : "gap-1"}
              onClick={() => update(items.map((x, j) => j === i ? { ...x, isTrue: false } : x))}
            >
              <XCircle className="h-3 w-3" /> Falso
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...items, { text: "", isTrue: true }])}>
        <Plus className="h-3 w-3" /> Agregar afirmación
      </Button>
    </div>
  );
}

// ── WORDSEARCH / CROSSWORD ──
function WordsEditor({ type, value, onChange }: { type: ActivityType; value: any; onChange: (v: any) => void }) {
  const isCrossword = type === "CROSSWORD";

  if (isCrossword) {
    const clues: Array<{ word: string; hint: string }> = Array.isArray(value?.clues) && value.clues.length > 0
      ? value.clues
      : [{ word: "", hint: "" }];
    const update = (next: typeof clues) => onChange({ clues: next });
    return (
      <div className="space-y-3">
        {clues.map((c, i) => (
          <div key={i} className="rounded-xl border border-border/40 p-3 bg-card/40 grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
            <Input value={c.word} placeholder="PALABRA" onChange={(e) => update(clues.map((x, j) => j === i ? { ...x, word: e.target.value.toUpperCase() } : x))} className="font-bold uppercase tracking-wide" />
            <Input value={c.hint} placeholder="Pista para el estudiante" onChange={(e) => update(clues.map((x, j) => j === i ? { ...x, hint: e.target.value } : x))} />
            {clues.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="text-red-400" onClick={() => update(clues.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...clues, { word: "", hint: "" }])}>
          <Plus className="h-3 w-3" /> Agregar palabra
        </Button>
      </div>
    );
  }

  // WORDSEARCH
  const words: string[] = Array.isArray(value?.words) ? value.words : [];
  const gridSize: number = value?.gridSize || 12;
  const text = words.join(", ");

  return (
    <div className="space-y-2">
      <Label>Palabras (separadas por comas)</Label>
      <Textarea
        value={text}
        onChange={(e) => {
          const parts = e.target.value
            .split(/[,\n]/)
            .map(p => p.trim().toUpperCase())
            .filter(Boolean);
          onChange({ words: parts, gridSize });
        }}
        placeholder="LIBRO, LECTURA, AVENTURA, PROTAGONISTA, NARRADOR"
        className="min-h-[100px]"
      />
      <div className="flex items-center gap-2">
        <Label className="text-xs">Tamaño del tablero:</Label>
        <Input
          type="number"
          min={6}
          max={20}
          value={gridSize}
          onChange={(e) => onChange({ words, gridSize: Math.max(6, Math.min(20, Number(e.target.value))) })}
          className="w-20 h-8"
        />
        <span className="text-xs text-muted-foreground">×{gridSize} celdas</span>
      </div>
    </div>
  );
}

// ── REORDER ──
function ReorderEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const items: ReorderS[] = Array.isArray(value?.sentences) && value.sentences.length > 0
    ? value.sentences
    : [{ id: 1, sentence: "" }];
  const update = (next: ReorderS[]) =>
    onChange({ sentences: next.map((s, i) => ({ ...s, id: i + 1 })) });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Escribe las frases en el ORDEN CORRECTO. El juego se las mostrará al estudiante mezcladas para que las reordene.
      </p>
      {items.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-sm font-bold text-indigo-400 w-6 tabular-nums">{i + 1}º</span>
          <Input value={s.sentence} onChange={(e) => update(items.map((x, j) => j === i ? { ...x, sentence: e.target.value } : x))} placeholder={`Frase ${i + 1}`} />
          {items.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="text-red-400" onClick={() => update(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...items, { id: items.length + 1, sentence: "" }])}>
        <Plus className="h-3 w-3" /> Agregar frase
      </Button>
    </div>
  );
}

// ── MATCH ──
function MatchEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const pairs: MatchP[] = Array.isArray(value?.pairs) && value.pairs.length > 0
    ? value.pairs
    : [{ word: "", def: "" }];
  const update = (next: MatchP[]) => onChange({ pairs: next });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Pares concepto ↔ definición que el estudiante debe emparejar.</p>
      {pairs.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input value={p.word} onChange={(e) => update(pairs.map((x, j) => j === i ? { ...x, word: e.target.value } : x))} placeholder="Concepto" />
          <Input value={p.def} onChange={(e) => update(pairs.map((x, j) => j === i ? { ...x, def: e.target.value } : x))} placeholder="Definición" />
          {pairs.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="text-red-400" onClick={() => update(pairs.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...pairs, { word: "", def: "" }])}>
        <Plus className="h-3 w-3" /> Agregar par
      </Button>
    </div>
  );
}

// ── FILL_BLANK ──
function FillBlankEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const items: FillBlankItem[] = Array.isArray(value?.sentences) && value.sentences.length > 0
    ? value.sentences
    : [{ sentence: "", answer: "" }];
  const update = (next: FillBlankItem[]) => onChange({ sentences: next });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Escribe la frase usando <code className="bg-muted px-1 rounded">___</code> donde va el blanco. La respuesta esperada al lado.
      </p>
      {items.map((s, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-3 bg-card/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Frase {i + 1}</span>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-400" onClick={() => update(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Input value={s.sentence} onChange={(e) => update(items.map((x, j) => j === i ? { ...x, sentence: e.target.value } : x))} placeholder="El cielo es ___ durante el día." />
          <Input value={s.answer} onChange={(e) => update(items.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} placeholder="Respuesta esperada (ej: azul)" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...items, { sentence: "", answer: "" }])}>
        <Plus className="h-3 w-3" /> Agregar frase
      </Button>
    </div>
  );
}

// ── SHORT_ANSWER ──
function ShortAnswerEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const items: ShortAnswerItem[] = Array.isArray(value?.questions) && value.questions.length > 0
    ? value.questions
    : [{ question: "", answer: "" }];
  const update = (next: ShortAnswerItem[]) => onChange({ questions: next });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Preguntas con respuesta corta (el sistema acepta variaciones de mayúsculas y espacios).</p>
      {items.map((q, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-3 bg-card/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pregunta {i + 1}</span>
            {items.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-red-400" onClick={() => update(items.filter((_, j) => j !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Input value={q.question} onChange={(e) => update(items.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} placeholder="¿Cuál es la capital de Francia?" />
          <Input value={q.answer} onChange={(e) => update(items.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} placeholder="París" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => update([...items, { question: "", answer: "" }])}>
        <Plus className="h-3 w-3" /> Agregar pregunta
      </Button>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium text-foreground ${className}`}>{children}</div>;
}

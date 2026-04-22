"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, GraduationCap, BookText, Sparkles, Loader2, Copy, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function TeacherAiToolsPage() {
  const [activeTool, setActiveTool] = useState<"lesson-planner" | "dictionary" | "text-generator">("lesson-planner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Lesson planner inputs
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [duration, setDuration] = useState("45 minutos");
  const [bookTitle, setBookTitle] = useState("");

  // Dictionary input
  const [term, setTerm] = useState("");
  const [dictContext, setDictContext] = useState("");

  // Text generator inputs
  const [textTopic, setTextTopic] = useState("");
  const [textType, setTextType] = useState("Lectura corta");
  const [textLevel, setTextLevel] = useState("Intermedio");

  const handleSubmit = async () => {
    setLoading(true);
    setResult("");
    setCopied(false);

    let input: any = {};
    switch (activeTool) {
      case "lesson-planner":
        input = { topic, grade, duration, bookTitle };
        break;
      case "dictionary":
        input = { term, context: dictContext };
        break;
      case "text-generator":
        input = { topic: textTopic, type: textType, level: textLevel };
        break;
    }

    try {
      const res = await fetch("/api/ai/teacher-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: activeTool, input }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.result || "Sin resultado");
      } else {
        const err = await res.json().catch(() => null);
        setResult(`Error: ${err?.message || "No se pudo procesar"}`);
      }
    } catch {
      setResult("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tools = [
    { id: "lesson-planner" as const, icon: GraduationCap, label: "Preparador de Clases", color: "bg-indigo-500/20 text-indigo-300" },
    { id: "dictionary" as const, icon: BookOpen, label: "Diccionario Educativo", color: "bg-emerald-100 text-emerald-700" },
    { id: "text-generator" as const, icon: BookText, label: "Generador de Textos", color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-900 text-sm">Uso Exclusivo Educativo</h3>
          <p className="text-sm text-amber-700">
            Estas herramientas de IA son de uso exclusivo educativo dentro del aula. No están permitidas para fines comerciales.
          </p>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Herramientas IA para Docentes</h1>
        <p className="text-muted-foreground">Herramientas inteligentes para preparar tus clases.</p>
      </div>

      {/* Tool Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); setResult(""); }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeTool === tool.id
                ? "border-indigo-300 bg-indigo-500/10 shadow-sm"
                : "border-border bg-card hover:border-gray-300"
            }`}
          >
            <div className={`h-10 w-10 rounded-lg ${tool.color} flex items-center justify-center mb-2`}>
              <tool.icon className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground text-sm">{tool.label}</h3>
          </button>
        ))}
      </div>

      {/* Tool Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            {tools.find(t => t.id === activeTool)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTool === "lesson-planner" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tema de la Clase *</Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej. Comprensión lectora" />
                </div>
                <div className="space-y-2">
                  <Label>Grado/Nivel</Label>
                  <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Ej. 6to grado" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duración</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30 minutos">30 minutos</SelectItem>
                      <SelectItem value="45 minutos">45 minutos</SelectItem>
                      <SelectItem value="60 minutos">60 minutos</SelectItem>
                      <SelectItem value="90 minutos">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Libro de Referencia</Label>
                  <Input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
            </>
          )}

          {activeTool === "dictionary" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Término a Definir *</Label>
                <Input value={term} onChange={e => setTerm(e.target.value)} placeholder="Ej. Metáfora" />
              </div>
              <div className="space-y-2">
                <Label>Contexto Educativo</Label>
                <Input value={dictContext} onChange={e => setDictContext(e.target.value)} placeholder="Ej. Literatura 8vo" />
              </div>
            </div>
          )}

          {activeTool === "text-generator" && (
            <>
              <div className="space-y-2">
                <Label>Tema del Texto *</Label>
                <Input value={textTopic} onChange={e => setTextTopic(e.target.value)} placeholder="Ej. El ciclo del agua" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de Texto</Label>
                  <Select value={textType} onValueChange={setTextType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lectura corta">Lectura corta</SelectItem>
                      <SelectItem value="Cuento">Cuento</SelectItem>
                      <SelectItem value="Artículo informativo">Artículo informativo</SelectItem>
                      <SelectItem value="Diálogo">Diálogo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nivel</Label>
                  <Select value={textLevel} onValueChange={setTextLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Principiante">Principiante</SelectItem>
                      <SelectItem value="Intermedio">Intermedio</SelectItem>
                      <SelectItem value="Avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generar</>}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-indigo-500/50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Resultado</CardTitle>
            <Button variant="ghost" size="sm" onClick={copyResult} className="gap-1">
              {copied ? <><CheckCircle2 className="h-4 w-4 text-green-600" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

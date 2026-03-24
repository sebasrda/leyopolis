"use client";

import { useState } from "react";
import { 
  Upload, 
  FileText, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Languages,
  BookMarked,
  Clock,
  Layout,
  Download,
  History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function TranslatorPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "completed">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTranslate = () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setStatus("uploading");
    
    // Simulating translation process
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProgress(p);
      
      if (p === 40) setStatus("processing");
      
      if (p >= 100) {
        clearInterval(interval);
        setStatus("completed");
        setIsUploading(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Traductor Inteligente de Libros</h1>
          <p className="text-gray-500 mt-1">Sube libros en PDF, EPUB o DOCX y tradúcelos completamente con IA contextual.</p>
        </div>
        <Badge className="bg-indigo-600 text-white hover:bg-indigo-500 border-none px-4 py-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4 mr-2" /> Plan Premium
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 transition-colors p-12 text-center relative">
            <Input 
              type="file" 
              accept=".pdf,.epub,.docx"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            <CardContent className="space-y-6">
              <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Upload className="h-10 w-10 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-indigo-900">
                  {selectedFile ? selectedFile.name : "Arrastra tu libro aquí"}
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">Soporta formatos EPUB, PDF y DOCX (Máximo 50MB).</p>
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="bg-white border-indigo-200 pointer-events-none">
                  <FileText className="h-4 w-4 mr-2" /> 
                  {selectedFile ? "Cambiar Archivo" : "Seleccionar Archivo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {status !== "idle" && (
            <Card className="p-8 border-none shadow-xl bg-white space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    {status === "completed" ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">
                      {status === "uploading" && "Subiendo archivo..."}
                      {status === "processing" && "Traduciendo con IA..."}
                      {status === "completed" && "¡Traducción completa!"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : "Archivo desconocido"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="font-bold text-indigo-600 border-indigo-200">
                  {progress}%
                </Badge>
              </div>
              
              <Progress value={progress} className="h-3 bg-gray-100" />

              {status === "completed" ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-500 font-bold"
                    onClick={() => {
                      if (selectedFile) {
                        const title = encodeURIComponent(selectedFile.name.replace(/\.[^/.]+$/, ""));
                        window.location.href = `/dashboard/reader/uploaded-book?title=${title}`;
                      }
                    }}
                  >
                    <Layout className="h-4 w-4 mr-2" /> Abrir en Lector
                  </Button>
                  <Button variant="outline" className="border-indigo-200 text-indigo-600 font-bold">
                    <Download className="h-4 w-4 mr-2" /> Descargar Versión
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-center text-gray-400 italic">
                  La IA está analizando el contexto global del libro para mantener el estilo del autor.
                </p>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <Card className="border-none shadow-md p-6 space-y-4">
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-bold">Traducción Contextual</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                No traducimos palabra por palabra. Nuestra IA entiende la trama y mantiene la coherencia en todo el libro.
              </p>
            </Card>
            <Card className="border-none shadow-md p-6 space-y-4">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-bold">Preservación de Estilo</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Mantenemos el tono y estilo literario del autor original para que la experiencia sea auténtica.
              </p>
            </Card>
          </div>
        </div>

        {/* Translation Settings */}
        <div className="space-y-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-indigo-900 text-white">
              <CardTitle className="text-lg">Configuración IA</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 block">Idioma de Origen</label>
                <Button variant="outline" className="w-full justify-between border-gray-200">
                  <span className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-indigo-600" /> Inglés (Detectado)
                  </span>
                </Button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 block">Idioma de Destino</label>
                <Button variant="outline" className="w-full justify-between border-gray-200">
                  <span className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-emerald-600" /> Español (México)
                  </span>
                </Button>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-600 block">Nivel de Vocabulario</label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">Adaptar a B2</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">Original</Badge>
                </div>
              </div>

              <Button 
                onClick={handleTranslate} 
                disabled={isUploading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold h-12 shadow-lg shadow-indigo-100"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                Iniciar Traducción Completa
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-md flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-gray-400" /> Historial Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold group-hover:text-indigo-600 transition-colors">Sapiens_EN_to_ES.pdf</p>
                    <p className="text-[10px] text-gray-400">Hace 2 días • 12.4 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold group-hover:text-indigo-600 transition-colors">Don_Quijote_ES_to_EN.epub</p>
                    <p className="text-[10px] text-gray-400">Hace 5 días • 8.1 MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

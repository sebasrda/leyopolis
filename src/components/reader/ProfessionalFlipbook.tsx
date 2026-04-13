"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import Link from 'next/link';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize, Type, ScanLine, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Save, Moon, Sun, Languages, Gamepad2, GraduationCap, X, BookMarked, MessageSquare, Search, Highlighter, Sparkles } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ExamModal from './ExamModal';
import GamesModal from './GamesModal';
import AiTutorWidget, { AiTutorRef } from './AiTutorWidget';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearning } from '@/context/LearningContext';
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";

// Importar estilos necesarios para la capa de texto de react-pdf
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configurar worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ProfessionalFlipbookProps {
  pdfUrl: string;
  bookTitle?: string;
  initialPage?: number;
  bookId?: string;
  quizId?: string;
  author?: string;
}

// Interfaz para la selección de texto
interface TextSelection {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Componente Smart Menu (Menú Contextual Inteligente)
const SmartMenu = ({ selection, onDefine, onTranslate, onSaveVocab, onNote, onClose, hideAi }: { 
  selection: TextSelection; 
  onDefine: () => void; 
  onTranslate: () => void;
  onSaveVocab: () => void; 
  onNote: () => void;
  onClose: () => void;
  hideAi?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="fixed z-[100] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 flex items-center gap-1"
      style={{ 
        left: selection.x + selection.width / 2, 
        top: selection.y - 60, // Posicionar encima de la selección
        transform: 'translateX(-50%)' 
      }}
    >
      {!hideAi && (
        <>
          <button onClick={onDefine} className="flex flex-col items-center p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors group" title="Definir con IA">
            <Search size={16} className="text-indigo-600 dark:text-indigo-400 mb-1" />
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Definir</span>
          </button>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
        </>
      )}
      <button onClick={onTranslate} className="flex flex-col items-center p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors group" title="Traducir selección">
        <Languages size={16} className="text-blue-600 dark:text-blue-400 mb-1" />
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Traducir</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button onClick={onSaveVocab} className="flex flex-col items-center p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors group" title="Guardar en Vocabulario">
        <BookMarked size={16} className="text-green-600 dark:text-green-400 mb-1" />
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Guardar</span>
      </button>
      <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button onClick={onNote} className="flex flex-col items-center p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-md transition-colors group" title="Añadir Nota">
        <MessageSquare size={16} className="text-yellow-600 dark:text-yellow-400 mb-1" />
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Nota</span>
      </button>
      <button onClick={onClose} className="absolute -top-2 -right-2 bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 hover:bg-red-100 hover:text-red-500 transition-colors shadow-sm">
        <X size={12} />
      </button>
      
      {/* Flecha indicadora */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 transform rotate-45" />
    </motion.div>
  );
};

// Componente de Página Interna para Flipbook
const PageComponent = forwardRef<HTMLDivElement, { 
  pageNumber: number; 
  scale: number;
  width: number;
  height: number;
  pdfDocument: any;
  contentScale: number;
  contentOffsetY: number;
  contentOffsetX: number;
  isDarkMode: boolean;
  onTextSelection: (selection: TextSelection | null) => void;
}>(({ pageNumber, scale, width, height, pdfDocument, contentScale, contentOffsetY, contentOffsetX, isDarkMode, onTextSelection }, ref) => {
  
  // Manejador de selección de texto local a la página
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Solo notificar si la selección está dentro de esta página (aproximadamente)
      // En realidad, getBoundingClientRect es global, así que está bien.
      onTextSelection({
        text: selection.toString(),
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });
    } else {
      // Si se hace clic sin seleccionar, limpiar (manejado por el padre globalmente también)
      // onTextSelection(null); 
    }
  };

  return (
    <div ref={ref} className={cn("w-full h-full shadow-lg overflow-hidden relative", isDarkMode ? "bg-black" : "bg-white")} onMouseUp={handleMouseUp}>
      <div className="w-full h-full flex items-center justify-center">
        {/* Usamos un wrapper div simple para el contenido primero */}
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
             <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={3}
                centerOnInit={true}
                wheel={{ disabled: false, step: 0.1 }}
                pinch={{ disabled: false }}
                doubleClick={{ disabled: false, mode: 'zoomIn' }}
             >
                <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center" contentClass="!w-full !h-full flex items-center justify-center">
                    <div 
                        className="transition-transform duration-300 ease-out origin-center w-full h-full flex items-center justify-center"
                        style={{ transform: `translate(${contentOffsetX}%, ${contentOffsetY}%)` }} 
                    >
                        <div style={{ filter: isDarkMode ? 'invert(1) hue-rotate(180deg) contrast(0.8)' : 'none', transition: 'filter 0.3s' }}>
                            <Page
                            pageNumber={pageNumber}
                            height={height * scale * contentScale} 
                            renderTextLayer={true} // ACTIVAR CAPA DE TEXTO
                            renderAnnotationLayer={true} // ACTIVAR CAPA DE ANOTACIONES (Links)
                            pdf={pdfDocument} 
                            loading={
                                <div className="flex items-center justify-center w-full h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            }
                            className="shadow-sm max-w-none text-layer-selectable" // Clase personalizada opcional 
                            />
                        </div>
                    </div>
                </TransformComponent>
             </TransformWrapper>
        </div>
      </div>
      {/* Sombra de pliegue central mejorada */}
      <div className={cn(
        "absolute top-0 bottom-0 w-12 z-10 pointer-events-none mix-blend-multiply opacity-40",
        pageNumber % 2 === 0 
          ? "right-0 bg-gradient-to-l from-black via-gray-400/20 to-transparent" 
          : "left-0 bg-gradient-to-r from-black via-gray-400/20 to-transparent"
      )} />
      {/* Línea divisoria sutil */}
       <div className={cn(
        "absolute top-0 bottom-0 w-px z-20 bg-black/10",
        pageNumber % 2 === 0 ? "right-0" : "left-0"
      )} />
      
      <div className="absolute bottom-4 text-xs text-gray-400 font-mono w-full text-center z-30">
        {pageNumber}
      </div>
    </div>
  );
});
PageComponent.displayName = "PageComponent";

export default function ProfessionalFlipbook({ pdfUrl, bookTitle = "Libro", author, bookId, quizId }: ProfessionalFlipbookProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [contentScale, setContentScale] = useState<number>(1.0); // Default 1.0 (Sin zoom)
  const [contentOffsetY, setContentOffsetY] = useState<number>(0); // Default 0 (Centrado)
  const [contentOffsetX, setContentOffsetX] = useState<number>(0); // Nuevo estado para offset X
  const [isDarkMode, setIsDarkMode] = useState(false); // Nuevo estado para modo oscuro
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [goToPageInput, setGoToPageInput] = useState("");
  
  // Offset for Virtual Pages (Cover + Credits)
  const VIRTUAL_PAGES = 2;
  const { i18n: uiI18n } = useTranslation();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "STUDENT"; // Fallback a STUDENT si no hay sesión

  // Estados para Traducción
  const [translatedLanguage, setTranslatedLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationOverlay, setTranslationOverlay] = useState<string | null>(null);
  const [currentTextContent, setCurrentTextContent] = useState<string>("");
  const [bilingualMode, setBilingualMode] = useState(false);
  const [translationSource, setTranslationSource] = useState<string | null>(null);
  const bilingualModeRef = useRef(false);

  useEffect(() => {
    bilingualModeRef.current = bilingualMode;
  }, [bilingualMode]);

  // Estado para Selección de Texto (Smart Menu)
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [showNotification, setShowNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Modales
  const [showExam, setShowExam] = useState(false);
  const [showGames, setShowGames] = useState(false);
  
  // Referencia al Tutor IA
  const aiTutorRef = useRef<AiTutorRef>(null);
  
  // Contexto de Aprendizaje
  const { addVocabulary, addNote, updateReadingProgress } = useLearning();

  // --- READING SESSION TRACKING ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const pagesReadRef = useRef<Set<number>>(new Set());
  const currentPageRef = useRef<number>(0);
  const numPagesRef = useRef<number>(0);

  useEffect(() => {
    currentPageRef.current = currentPage;
    numPagesRef.current = numPages;
  }, [currentPage, numPages]);

  // 1. Start Session on Mount
  useEffect(() => {
    if (!bookId) return;

    const startSession = async () => {
      try {
        const res = await fetch('/api/reading-session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, bookTitle, contentUrl: pdfUrl })
        });
        
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
          sessionStartTimeRef.current = new Date();
          console.log("Reading session started:", data.sessionId);
        }
      } catch (error) {
        console.error("Failed to start reading session:", error);
      }
    };

    startSession();

    // Cleanup: End Session on Unmount
    return () => {
      const sid = sessionIdRef.current;
      if (sid) {
        // We use beacon for reliability on unmount/close
        const duration = sessionStartTimeRef.current 
          ? Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000) 
          : 0;
        
        const payload = JSON.stringify({
          sessionId: sid,
          durationSeconds: duration,
          pagesRead: pagesReadRef.current.size,
          progress: Math.floor((currentPageRef.current / (numPagesRef.current || 1)) * 100),
          bookId
        });
        
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/reading-session/end', blob);
      }
    };
  }, [bookId]); // Depend on bookId

  // 2. Track Pages Read
  useEffect(() => {
    if (currentPage >= 0) {
      pagesReadRef.current.add(currentPage);
    }
  }, [currentPage, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      const duration = sessionStartTimeRef.current
        ? Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000)
        : 0;

      fetch("/api/reading-session/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          durationSeconds: duration,
          pagesRead: pagesReadRef.current.size,
          progress: Math.floor((currentPageRef.current / (numPagesRef.current || 1)) * 100),
          bookId,
        }),
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, bookId]);
  
  // 3. Handle Window Close / Refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
        const sid = sessionIdRef.current;
        if (sid) {
            const duration = sessionStartTimeRef.current 
              ? Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000) 
              : 0;
            
            const payload = JSON.stringify({
              sessionId: sid,
              durationSeconds: duration,
              pagesRead: pagesReadRef.current.size,
              progress: Math.floor((currentPageRef.current / (numPagesRef.current || 1)) * 100),
              bookId
            });
            
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/reading-session/end', blob);
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, currentPage, numPages, bookId]);

  // Cargar preferencias guardadas al iniciar (DB primero, luego localStorage)
  useEffect(() => {
    let cancelled = false;

    const applySettings = (parsed: any) => {
      if (parsed.scale) setContentScale(parsed.scale);
      if (parsed.offsetX !== undefined) setContentOffsetX(parsed.offsetX);
      if (parsed.offsetY !== undefined) setContentOffsetY(parsed.offsetY);
      if (parsed.isDarkMode !== undefined) setIsDarkMode(parsed.isDarkMode);
    };

    const loadSettings = async () => {
      // 1. Intentar localStorage específico del libro (preferencia personal del usuario)
      if (pdfUrl) {
        const savedSettings = localStorage.getItem(`flipbook-settings-${pdfUrl}`);
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            if (!cancelled) applySettings(parsed);
            return;
          } catch {}
        }
      }

      // 2. Intentar cargar desde la base de datos (configuración del admin para TODOS los usuarios)
      if (bookId) {
        try {
          const res = await fetch(`/api/books/${bookId}/display-settings`);
          if (res.ok) {
            const data = await res.json();
            // Per-book DB settings
            if (data.settings && !cancelled) {
              applySettings(data.settings);
              return;
            }
            // Global DB settings
            if (data.globalSettings && !cancelled) {
              applySettings(data.globalSettings);
              return;
            }
          }
        } catch {}
      }

      // 3. Fallback: localStorage global
      const globalSettings = localStorage.getItem(`flipbook-global-settings`);
      if (globalSettings) {
        try {
          const parsed = JSON.parse(globalSettings);
          if (!cancelled) applySettings(parsed);
        } catch {}
      }
    };

    loadSettings();
    return () => { cancelled = true; };
  }, [pdfUrl, bookId]);

  // Guardar configuración GLOBAL (para ADMIN/SUPERADMIN se guarda en BD, para otros en localStorage)
  const saveAsGlobalDefault = async () => {
    const settings = {
      scale: contentScale,
      offsetX: contentOffsetX,
      offsetY: contentOffsetY,
      isDarkMode: isDarkMode,
    };

    // Siempre guardar en localStorage como fallback
    localStorage.setItem(`flipbook-global-settings`, JSON.stringify(settings));

    const isAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";

    if (isAdmin) {
      try {
        // Guardar configuración GLOBAL en BD (para todos los usuarios)
        await fetch("/api/settings/flipbook-defaults", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        // También guardar configuración para ESTE libro específico en BD
        if (bookId) {
          await fetch(`/api/books/${bookId}/display-settings`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
          });
        }
      } catch (e) {
        console.error("Error saving to DB:", e);
      }
    }

    // Feedback visual
    const btn = document.getElementById('save-global-btn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = isAdmin
        ? '<span class="text-green-400 text-xs">¡Guardado para TODOS!</span>'
        : '<span class="text-green-400 text-xs">¡Guardado!</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2500);
    }
  };

  // Guardar preferencias específicas del usuario actual en localStorage
  useEffect(() => {
    if (pdfUrl && !loading) {
      const settings = {
        scale: contentScale,
        offsetX: contentOffsetX,
        offsetY: contentOffsetY,
        isDarkMode: isDarkMode
      };
      localStorage.setItem(`flipbook-settings-${pdfUrl}`, JSON.stringify(settings));
    }
  }, [contentScale, contentOffsetX, contentOffsetY, isDarkMode, pdfUrl, loading]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [documentKey, setDocumentKey] = useState(0); // Forzar recarga de documento si falla
  const [isSinglePage, setIsSinglePage] = useState(false); // Nuevo estado para modo una página
  
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);

  // Reset document state when PDF URL changes
  useEffect(() => {
    setPdfDocument(null);
    setLoading(true);
    setNumPages(0);
  }, [pdfUrl]);

  // 1. Cargar documento y obtener dimensiones originales
  const onDocumentLoadSuccess = async (pdf: any) => {
    setPdfDocument(pdf); // Guardar referencia al objeto PDF cargado
    setNumPages(pdf.numPages);
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);
      setLoading(false);
    } catch (error) {
      console.error("Error loading page dimensions:", error);
      setLoading(false);
    }
  };

  // 2. Calcular escala óptima y modo de visualización
  const calculateScale = useCallback(() => {
    if (!containerRef.current || !pageWidth || !pageHeight) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Determinar si debemos usar modo de una página (móvil o ventana vertical)
    const isPortrait = containerHeight > containerWidth;
    const isNarrow = containerWidth < 1000; // Umbral para pasar a una página
    const shouldBeSinglePage = isPortrait || isNarrow;
    
    setIsSinglePage(shouldBeSinglePage);

    // Calcular ancho objetivo (1 o 2 páginas)
    const targetWidth = shouldBeSinglePage ? pageWidth : pageWidth * 2;
    
    // Calcular factores de escala
    const scaleX = containerWidth / targetWidth;
    const scaleY = containerHeight / pageHeight;

    // Usar el menor para asegurar que quepa (contain), maximizando el espacio (0.98)
    const optimalScale = Math.min(scaleX, scaleY) * 0.98;

    // Ensure scale is never 0 or NaN
    if (optimalScale > 0 && !isNaN(optimalScale)) {
        setScale(optimalScale);
    }
  }, [pageWidth, pageHeight]);

  // Observer para redimensionamiento
  useEffect(() => {
    if (!loading && pageWidth > 0) {
      calculateScale();
      
      const observer = new ResizeObserver(() => {
        calculateScale();
      });
      
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      
      window.addEventListener('resize', calculateScale);
      
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', calculateScale);
      };
    }
  }, [loading, pageWidth, calculateScale]); // Include dependencies correctly

  // Manejo de Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        // Request fullscreen on the container element, not documentElement, 
        // to ensure the component maintains context and styles
        if (containerRef.current) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
             document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Forzar recálculo después de la transición
      setTimeout(calculateScale, 200); 
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [calculateScale]);

  // Controles del Flipbook
  const nextFlip = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const prevFlip = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  // Zoom manual (afecta la escala calculada)
  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.2, Math.min(prev + delta, 3.0)));
  };

  // Zoom de contenido (recorte de márgenes)
  const handleContentZoom = (delta: number) => {
    setContentScale(prev => Math.max(1.0, Math.min(prev + delta, 2.5)));
  };

  // Ajuste de posición vertical
  const handleVerticalOffset = (delta: number) => {
    setContentOffsetY(prev => Math.max(-50, Math.min(prev + delta, 50)));
  };

  // Ajuste de posición horizontal
  const handleHorizontalOffset = (delta: number) => {
    setContentOffsetX(prev => Math.max(-50, Math.min(prev + delta, 50)));
  };

  // Manejo de teclas para navegación
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextFlip();
      } else if (e.key === 'ArrowLeft') {
        prevFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array as nextFlip/prevFlip use refs

  // Actualizar el contenido de texto cuando cambia la página
  useEffect(() => {
    let isMounted = true;
    const fetchPageText = async () => {
        // Verificar rango válido y existencia del documento
        if (!pdfDocument || !pdfDocument.numPages) return;
        
        try {
            const pageNum = currentPage + 1;
            if (pageNum > pdfDocument.numPages || pageNum < 1) return;

            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            if (isMounted) {
                const textItems = textContent.items.map((item: any) => item.str).join(' ');
                setCurrentTextContent(textItems || "");
            }
        } catch (e) {
            console.error("Error extracting text on page change", e);
        }
    };
    
    fetchPageText();
    return () => { isMounted = false; };
  }, [currentPage, pdfDocument]);

  // Servicio de Traducción con Gemini API
  const handleTranslate = async (lang: string, force: boolean = false) => {
    if (translatedLanguage === lang && !force) {
        closeTranslation();
        return;
    }

    const bilingual = bilingualModeRef.current;
    setIsTranslating(true);
    setTranslatedLanguage(lang);
    if (!bilingual) setTranslationSource(null);
    
    try {
        // 1. Get text content from current page
        let textToTranslate = currentTextContent;
        
        if (!textToTranslate && pdfDocument) {
            try {
                // Try to extract text from current page(s)
                const pageNum = currentPage + 1;
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                const textItems = textContent.items.map((item: any) => item.str).join(' ');
                textToTranslate = textItems || `[Contenido de la página ${pageNum} del libro ${bookTitle}]`;
                setCurrentTextContent(textToTranslate); // Cache it
            } catch (e) {
                console.error("Error extracting text", e);
                textToTranslate = `[Texto de la página ${currentPage + 1}]`;
            }
        }

        if (bilingual) {
            setTranslationSource(textToTranslate);
        }

        // 2. Call API
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToTranslate,
                targetLanguage: lang
            })
        });

        if (!response.ok) throw new Error("Translation failed");
        
        const data = await response.json();
        setTranslationOverlay(data.translation);

    } catch (error) {
        console.error("Translation error:", error);
        setTranslationOverlay("Error al traducir el contenido. Por favor intenta de nuevo.");
    } finally {
        setIsTranslating(false);
    }
  };

  const closeTranslation = () => {
    setTranslatedLanguage(null);
    setTranslationOverlay(null);
    setBilingualMode(false);
    bilingualModeRef.current = false;
    setTranslationSource(null);
  };

  useEffect(() => {
    const lang = uiI18n.language;
    if (lang === "es") return;

    const map: Record<string, string> = { en: "EN", fr: "FR", de: "DE", zh: "ZH" };
    const target = map[lang];
    if (!target) return;
    if (!pdfDocument) return;
    if (translatedLanguage && translatedLanguage !== target) return;
    void handleTranslate(target, true);
  }, [uiI18n.language, currentPage, pdfDocument]);

  // Manejo de Selección de Texto
  const handleTextSelection = (selection: TextSelection | null) => {
    setTextSelection(selection);
  };

  // Limpiar selección al cambiar de página o hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Si el clic no fue en el menú inteligente, limpiar selección
      // (La lógica real es más compleja, pero esto sirve para limpiar al hacer clic en el fondo)
      if (textSelection && !(e.target as Element).closest('.smart-menu')) {
        setTextSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [textSelection]);

  // Acciones del Menú Inteligente
  const handleDefine = () => {
    if (!textSelection) return;
    const query = `Define la palabra o frase: "${textSelection.text}" en el contexto de este libro.`;
    
    // Usar la referencia para abrir el tutor con la consulta
    if (aiTutorRef.current) {
        aiTutorRef.current.openWithQuery(query);
        setTextSelection(null);
        window.getSelection()?.removeAllRanges();
    } else {
        // Fallback si la referencia no está lista
        setShowNotification({ message: "Consultando al Tutor IA...", type: 'info' });
        setTimeout(() => {
            setShowNotification({ message: "Definición enviada al chat del Tutor", type: 'success' });
            setTextSelection(null);
        }, 1000);
    }
  };

  const resolveTargetLangCode = () => {
    if (translatedLanguage) return translatedLanguage;
    const map: Record<string, string> = { en: "EN", fr: "FR", de: "DE", zh: "ZH" };
    return map[uiI18n.language] || "EN";
  };

  const handleTranslateSelection = async () => {
    if (!textSelection) return;
    const target = resolveTargetLangCode();
    const text = textSelection.text.trim();
    if (!text) return;

    setBilingualMode(false);
    setTranslatedLanguage(target);
    setIsTranslating(true);
    setTranslationSource(text);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: target }),
      });
      if (!response.ok) throw new Error("Translation failed");
      const data = await response.json();
      setTranslationOverlay(data.translation);
    } catch {
      setTranslationOverlay("Error al traducir la selección. Por favor intenta de nuevo.");
    } finally {
      setIsTranslating(false);
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSaveVocab = () => {
    if (!textSelection) return;
    
    // Guardar en el contexto global
    addVocabulary(
        textSelection.text, 
        `Página ${currentPage + 1}`, 
        bookTitle, 
        "Definición pendiente (Consultar al Tutor)"
    );
    
    setShowNotification({ message: `"${textSelection.text}" guardado en tu Banco de Vocabulario`, type: 'success' });
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleNote = () => {
    if (!textSelection) return;
    const note = window.prompt("Añadir nota para esta selección:", "");
    if (note) {
      addNote(note, currentPage + 1, bookTitle, textSelection.text);
      setShowNotification({ message: "Nota guardada correctamente", type: 'success' });
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Toast de Notificación
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  return (
    <div className={cn("flex flex-col h-screen w-full overflow-hidden transition-colors duration-300", isDarkMode ? "bg-black text-gray-200" : "bg-[#1c1c1c] text-white")}>
      {/* Notificación Toast */}
      <AnimatePresence>
        {showNotification && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                    "fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-xl font-medium text-sm flex items-center gap-2",
                    showNotification.type === 'success' ? "bg-green-600 text-white" : "bg-indigo-600 text-white"
                )}
            >
                {showNotification.type === 'success' ? <BookMarked size={16} /> : <Loader2 size={16} className="animate-spin" />}
                {showNotification.message}
            </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Menu Overlay */}
      <AnimatePresence>
        {textSelection && (
            <div className="smart-menu">
                <SmartMenu 
                    selection={textSelection}
                    onDefine={handleDefine}
                    onTranslate={handleTranslateSelection}
                    onSaveVocab={handleSaveVocab}
                    onNote={handleNote}
                    hideAi={userRole === "STUDENT"}
                    onClose={() => {
                        setTextSelection(null);
                        window.getSelection()?.removeAllRanges();
                    }}
                />
            </div>
        )}
      </AnimatePresence>

      {/* Header Rediseñado - Más compacto y responsive */}
      <header className={cn("h-16 flex items-center justify-between px-4 shadow-md z-50 transition-colors duration-300 gap-4 overflow-x-auto scrollbar-hide shrink-0", isDarkMode ? "bg-gray-900 border-b border-gray-800" : "bg-[#2a2a2a]")}>
        
        {/* Izquierda: Título y Herramientas Educativas */}
        <div className="flex items-center gap-4 shrink-0">
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className={cn("p-2 rounded-full transition-colors shrink-0 flex items-center justify-center border", isDarkMode ? "bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700" : "bg-white/10 border-white/20 text-gray-200 hover:bg-white/20")}
                title="Cambiar Tema"
            >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex flex-col">
                <h1 className="text-sm font-medium truncate max-w-[150px] opacity-90">{bookTitle}</h1>
                <span className="text-[10px] text-gray-400">Página {currentPage + 1} de {numPages}</span>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowExam(true)}
                  className="flex flex-col items-center justify-center w-12 h-10 hover:bg-white/10 rounded-md transition-colors group relative"
                  title="Examen"
                >
                    <GraduationCap size={16} className="text-indigo-400 group-hover:text-indigo-300 mb-0.5" />
                    <span className="text-[9px] font-medium">Examen</span>
                </button>
                <button 
                  onClick={() => setShowGames(true)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[60px] h-10 px-2 rounded-md transition-all gap-0.5 border shadow-sm group",
                    isDarkMode ? "bg-pink-900/20 border-pink-500/30 hover:bg-pink-900/40" : "bg-pink-600/10 border-pink-600/20 hover:bg-pink-600/20"
                  )}
                  title="Zona Interactiva"
                >
                    <Gamepad2 size={16} className="text-pink-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-pink-500">Juegos</span>
                </button>
                {quizId && (
                  <Link href={`/dashboard/quiz/${quizId}`}>
                    <button 
                      className="ml-2 flex items-center justify-center h-10 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-all gap-1.5 border-2 border-indigo-400 shadow-md group animate-bounce"
                      title="Hacer Quiz de 20 preguntas"
                    >
                        <Sparkles size={14} className="text-white" />
                        <span className="text-xs font-bold text-white uppercase tracking-tighter">Hacer Quiz</span>
                    </button>
                  </Link>
                )}
            </div>
        </div>
        
        {/* Derecha: Herramientas de Lectura */}
        <div className="flex items-center gap-3 shrink-0">
            
            {/* Traductor */}
            <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                <span className="text-xs text-gray-400 px-1.5"><Languages size={14} /></span>
                {['EN', 'ZH', 'FR', 'DE'].map((lang) => (
                    <button 
                        key={lang}
                        onClick={() => handleTranslate(lang)} 
                        className={cn(
                            "w-7 h-6 text-[10px] rounded font-bold transition-all",
                            translatedLanguage === lang 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : "hover:bg-white/10 text-gray-400"
                        )}
                    >
                        {lang}
                    </button>
                ))}
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button
                    onClick={() => {
                        const next = !bilingualMode;
                        bilingualModeRef.current = next;
                        setBilingualMode(next);
                        if (next) {
                            const map: Record<string, string> = { en: "EN", fr: "FR", de: "DE", zh: "ZH" };
                            const target = translatedLanguage || map[uiI18n.language] || "EN";
                            setTranslationSource(currentTextContent || null);
                            void handleTranslate(target, true);
                        } else {
                            setTranslationSource(null);
                        }
                    }}
                    className={cn(
                        "h-6 px-2 text-[10px] rounded font-bold transition-all",
                        bilingualMode ? "bg-emerald-600 text-white shadow-sm" : "hover:bg-white/10 text-gray-400"
                    )}
                    title="Modo bilingüe"
                >
                    BI
                </button>
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Controles de Posición (Restaurados) */}
            <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                <span className="text-xs text-gray-400 px-1.5"><ScanLine size={14} className="rotate-90" /></span>
                <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleVerticalOffset(-5)} className="p-0.5 hover:bg-white/10 rounded transition" title="Subir texto">
                        <ArrowUp size={10} />
                    </button>
                    <button onClick={() => handleVerticalOffset(5)} className="p-0.5 hover:bg-white/10 rounded transition" title="Bajar texto">
                        <ArrowDown size={10} />
                    </button>
                </div>
                <div className="flex gap-0.5">
                    <button onClick={() => handleHorizontalOffset(-5)} className="p-1 hover:bg-white/10 rounded transition" title="Mover izquierda">
                        <ArrowLeft size={14} />
                    </button>
                    <button onClick={() => handleHorizontalOffset(5)} className="p-1 hover:bg-white/10 rounded transition" title="Mover derecha">
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Ajustes Visuales */}
            <div className="flex items-center gap-1">
                
                <button 
                    id="save-global-btn"
                    onClick={saveAsGlobalDefault} 
                    className={cn(
                      "p-2 hover:bg-white/10 rounded-full transition",
                      (userRole === "ADMIN" || userRole === "SUPERADMIN")
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-green-400 hover:text-green-300"
                    )}
                    title={(userRole === "ADMIN" || userRole === "SUPERADMIN") 
                      ? "Guardar orientación para TODOS los usuarios" 
                      : "Guardar orientación"}
                >
                    <Save size={18} />
                </button>
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Pantalla Completa */}
            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition text-gray-300" title="Pantalla Completa">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
        </div>
      </header>

      {/* Main Container - Full Height for Book */}
      <div className="flex-1 relative flex overflow-hidden">
        
        {/* Original PDF Viewer - Always Full Size */}
        <div className="flex-1 h-full relative">
            <div className="w-full h-full flex items-center justify-center bg-gray-900/50 p-0" ref={containerRef} data-i18n-skip="true">
                <Document
                key={documentKey}
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[#1c1c1c]">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
                    <p className="text-sm text-gray-400">Cargando libro...</p>
                    </div>
                }
                className="flex items-center justify-center w-full h-full"
                onLoadError={(error) => console.error("Error loading PDF:", error)}
                >
                {!loading && numPages > 0 && pageWidth > 0 && pdfDocument && (
                    <div 
                    className="relative transition-transform duration-300 ease-out shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                    style={{
                        width: isSinglePage ? pageWidth * scale : pageWidth * scale * 2,
                        height: pageHeight * scale,
                    }}
                    >
                    <HTMLFlipBook
                        key={`flipbook-${scale}-${numPages}-${isSinglePage}`}
                        width={pageWidth * scale}
                        height={pageHeight * scale}
                        size="fixed"
                        minWidth={200}
                        maxWidth={3000}
                        minHeight={200}
                        maxHeight={3000}
                        maxShadowOpacity={0.5}
                        showCover={true}
                        mobileScrollSupport={true}
                        className="mx-auto"
                        ref={flipBookRef}
                        onFlip={(e) => {
                            const newPage = e.data;
                            setCurrentPage(newPage);
                            setTextSelection(null);
                            
                            // Save progress if bookId is available
                            // Adjusted for virtual pages
                            if (bookId) {
                                const realPage = Math.max(1, newPage - VIRTUAL_PAGES + 1);
                                updateReadingProgress(bookId, realPage, numPages);
                            }
                        }}
                        flippingTime={1000}
                        usePortrait={isSinglePage}
                        startZIndex={0}
                        autoSize={true}
                        clickEventForward={true}
                        useMouseEvents={true}
                        swipeDistance={30}
                        showPageCorners={true}
                        disableFlipByClick={false}
                        startPage={0}
                        drawShadow={true}
                        style={{}} 
                    >
                        {/* PÁGINA 1: PORTADA ESTANDARIZADA */}
                        <div className="demoPage">
                          <div className={cn("w-full h-full flex flex-col items-center justify-center p-12 text-center relative overflow-hidden", isDarkMode ? "bg-indigo-950 text-white" : "bg-indigo-600 text-white")}>
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                            <div className="relative z-10 space-y-8">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/30">
                                  <Library size={48} className="text-yellow-300" />
                                </div>
                                <h1 className="text-4xl font-bold tracking-tight leading-tight">{bookTitle}</h1>
                                <div className="h-1 w-24 bg-yellow-400 mx-auto" />
                                <p className="text-xl font-medium opacity-90">{author || "Autor Desconocido"}</p>
                                <div className="pt-20">
                                  <div className="text-sm font-bold tracking-[0.2em] uppercase opacity-60">LEYOPOLIS</div>
                                  <div className="text-[10px] opacity-40 mt-1">Plataforma de Lectura Inteligente</div>
                                </div>
                            </div>
                          </div>
                        </div>

                        {/* PÁGINA 2: CRÉDITOS */}
                        <div className="demoPage">
                          <div className={cn("w-full h-full p-16 flex flex-col justify-between border-l", isDarkMode ? "bg-black text-gray-400 border-gray-800" : "bg-white text-gray-600 border-gray-100")}>
                            <div className="space-y-12">
                                <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Créditos y Derechos</h2>
                                <div className="space-y-6 text-sm leading-relaxed">
                                  <p>Este libro es parte del catálogo digital de **Leyopolis**, diseñado para fomentar el hábito de la lectura mediante herramientas de Inteligencia Artificial.</p>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">Obra original:</p>
                                    <p>{bookTitle} por {author || "Autor Desconocido"}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">Personalización IA:</p>
                                    <p>Actividades, quizzes y juegos generados por el motor de razonamiento de Leyopolis.</p>
                                  </div>
                                </div>
                            </div>
                            <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] text-center italic">Queda prohibida la reproducción total o parcial de este contenido sin autorización expresa de los titulares de los derechos.</p>
                                <p className="text-[10px] text-center mt-4 font-bold">© 2026 LEYOPOLIS. Todos los derechos reservados.</p>
                            </div>
                          </div>
                        </div>

                        {/* PÁGINAS DEL PDF (Originales) */}
                        {Array.from(new Array(numPages), (_, index) => (
                        <div key={index + VIRTUAL_PAGES} className="demoPage" style={{ width: pageWidth * scale, height: pageHeight * scale }}>
                                <PageComponent 
                                pageNumber={index + 1}
                                width={pageWidth}
                                height={pageHeight}
                                scale={scale}
                                contentScale={contentScale}
                                contentOffsetY={contentOffsetY}
                                contentOffsetX={contentOffsetX}
                                isDarkMode={isDarkMode}
                                pdfDocument={pdfDocument}
                                onTextSelection={handleTextSelection}
                                />
                        </div>
                        ))}
                    </HTMLFlipBook>
                    </div>
                )}
                </Document>

                {/* Navigation Controls (Floating) */}
                {!loading && numPages > 0 && (
                <>
                    <button 
                    onClick={prevFlip}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition z-50 disabled:opacity-30"
                    disabled={currentPage === 0}
                    >
                    <ChevronLeft size={24} />
                    </button>
                    <button 
                    onClick={nextFlip}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition z-50 disabled:opacity-30"
                    disabled={currentPage >= numPages - (isSinglePage ? 1 : 2)}
                    >
                    <ChevronRight size={24} />
                    </button>
                </>
                )}
            </div>
        </div>

        {/* Draggable/Floating Translation Modal */}
        <AnimatePresence>
            {translatedLanguage && (
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    drag
                    dragMomentum={false}
                    className={cn(
                        "absolute bottom-4 right-4 z-50 w-96 md:w-[450px] max-h-[60%] rounded-xl shadow-2xl border flex flex-col overflow-hidden",
                        isDarkMode ? "bg-gray-900 border-gray-700 shadow-black/50" : "bg-white border-gray-200 shadow-xl"
                    )}
                >
                    {/* Translation Header */}
                    <div className="h-10 bg-indigo-600 flex items-center justify-between px-4 text-white shrink-0 cursor-move">
                        <div className="flex items-center gap-2">
                            <Languages size={16} />
                            <span className="font-bold text-xs tracking-wide uppercase">
                                {bilingualMode ? `Bilingüe (ORIGINAL + ${translatedLanguage})` : `Traducción (${translatedLanguage})`}
                            </span>
                        </div>
                        <button onClick={closeTranslation} className="hover:bg-white/20 rounded p-1">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Translation Content */}
                    <div className="flex-1 overflow-y-auto p-6 relative">
                        {isTranslating ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-60">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                <span className="text-xs font-medium">Traduciendo...</span>
                            </div>
                        ) : (
                            bilingualMode ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={cn(
                                        "rounded-lg border p-3",
                                        isDarkMode ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-50"
                                    )}>
                                        <div className={cn("text-[11px] font-bold mb-2", isDarkMode ? "text-gray-200" : "text-gray-700")}>
                                            Original
                                        </div>
                                        <div className={cn(
                                            "prose prose-sm max-w-none font-serif leading-relaxed",
                                            isDarkMode ? "prose-invert text-gray-300" : "text-gray-800"
                                        )}>
                                            <p className="whitespace-pre-line">
                                                {translationSource || currentTextContent || "Selecciona una página o extrae texto para ver el original."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "rounded-lg border p-3",
                                        isDarkMode ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-gray-50"
                                    )}>
                                        <div className={cn("text-[11px] font-bold mb-2", isDarkMode ? "text-gray-200" : "text-gray-700")}>
                                            Traducción ({translatedLanguage})
                                        </div>
                                        <div className={cn(
                                            "prose prose-sm max-w-none font-serif leading-relaxed",
                                            isDarkMode ? "prose-invert text-gray-300" : "text-gray-800"
                                        )}>
                                            <p className="whitespace-pre-line">{translationOverlay}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={cn(
                                    "prose prose-sm max-w-none font-serif leading-relaxed text-justify",
                                    isDarkMode ? "prose-invert text-gray-300" : "text-gray-800"
                                )}>
                                    {translationSource && (
                                        <p className={cn(
                                            "text-xs not-prose mb-3 rounded-md px-3 py-2 border",
                                            isDarkMode ? "border-gray-700 bg-gray-900/40 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-600"
                                        )}>
                                            {translationSource}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-line">{translationOverlay}</p>
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
      
      {/* Footer Info */}
      <footer className={cn("h-10 text-xs flex items-center justify-between px-6 border-t font-medium transition-colors duration-300", isDarkMode ? "bg-gray-900 border-gray-800 text-gray-500" : "bg-[#1c1c1c] border-white/5 text-gray-400")}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="opacity-60">Visualizando:</span>
            <span className={cn("px-2 py-0.5 rounded-full", isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white/10 text-white")}>
              Páginas {currentPage + 1} - {Math.min(currentPage + 2, numPages + VIRTUAL_PAGES)} de {numPages + VIRTUAL_PAGES}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="opacity-60">Ir a página:</span>
          <div className="flex items-center">
            <input 
              type="number" 
              min={1} 
              max={numPages + VIRTUAL_PAGES}
              className={cn("w-16 h-7 px-2 text-center bg-transparent border rounded-l-md outline-none transition-colors", isDarkMode ? "border-gray-700 focus:border-indigo-500" : "border-white/20 focus:border-indigo-400")}
              placeholder="#"
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const p = parseInt(goToPageInput);
                  if (!isNaN(p) && p >= 1 && p <= (numPages + VIRTUAL_PAGES)) {
                    flipBookRef.current?.pageFlip().flip(p - 1);
                    setGoToPageInput("");
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const p = parseInt(goToPageInput);
                if (!isNaN(p) && p >= 1 && p <= (numPages + VIRTUAL_PAGES)) {
                  flipBookRef.current?.pageFlip().flip(p - 1);
                  setGoToPageInput("");
                }
              }}
              className={cn("h-7 px-2 rounded-r-md flex items-center justify-center transition-colors", isDarkMode ? "bg-gray-800 hover:bg-indigo-900" : "bg-indigo-600 hover:bg-indigo-500")}
            >
              <ArrowRight size={14} className="text-white" />
            </button>
          </div>
        </div>
      </footer>

      {/* Modales */}
      <ExamModal isOpen={showExam} onClose={() => setShowExam(false)} bookTitle={bookTitle} bookId={bookId} />
      <GamesModal isOpen={showGames} onClose={() => setShowGames(false)} bookTitle={bookTitle} bookId={bookId} />
      
      {/* AI Tutor Widget */}
      {session?.user?.role !== "STUDENT" && (
        <div className="absolute bottom-6 left-6 z-[60]">
            <AiTutorWidget 
                ref={aiTutorRef}
                bookTitle={bookTitle} 
                currentPageNumber={currentPage + 1}
                currentPageText={currentTextContent}
                isDarkMode={isDarkMode}
            />
        </div>
      )}
    </div>
  );
}

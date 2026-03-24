
"use client";

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, User, Loader2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiTutorWidgetProps {
  bookTitle?: string;
  currentPageText?: string; // Optional context from the book
  currentPageNumber?: number;
  isDarkMode?: boolean;
  initialMessage?: string;
  mode?: 'reader' | 'general';
}

export interface AiTutorRef {
  openWithQuery: (query: string) => void;
}

const AiTutorWidget = forwardRef<AiTutorRef, AiTutorWidgetProps>(({ 
  bookTitle = "Leyopolis", 
  currentPageText = "", 
  currentPageNumber = 1, 
  isDarkMode = false,
  initialMessage,
  mode = 'reader'
}, ref) => {
  const [isOpen, setIsOpen] = useState(true); // Open by default
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  
  const defaultMessage = mode === 'reader' 
    ? `Hola! Soy tu tutor inteligente Gemini. Estoy aquí para ayudarte a entender "${bookTitle}". ¿Tienes alguna pregunta sobre la página ${currentPageNumber}?`
    : `Hola! Soy tu Tutor IA. ¿En qué puedo ayudarte hoy?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: initialMessage || defaultMessage,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const processQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          mode,
          context: {
            bookTitle,
            page: currentPageNumber,
            pageText: currentPageText
          }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch response');

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error asking AI Tutor:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Lo siento, tuve un problema al procesar tu pregunta. Inténtalo de nuevo.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    openWithQuery: (query: string) => {
      setIsOpen(true);
      processQuery(query);
    }
  }));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processQuery(input);
    setInput('');
  };

  const minimizeToDock = () => {
    setIsOpen(false);
    dragX.set(0);
    dragY.set(0);
  };

  return (
    <motion.div 
      drag={isOpen}
      dragMomentum={false}
      className="flex flex-col items-start font-sans pointer-events-none"
      style={{ x: dragX, y: dragY }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 cursor-default pointer-events-auto"
            // We want to stop propagation for CONTENT, but ALLOW it for HEADER
          >
            {/* Header - Allow Drag */}
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0 cursor-move"
              // No stopPropagation here, so drag bubbles to parent
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Sparkles size={18} className="text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Tutor IA
                  </h3>
                  <p className="text-[10px] text-blue-100 opacity-90">Powered by Google AI</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); minimizeToDock(); }} 
                className="h-8 w-8 hover:bg-white/20 text-white rounded-full cursor-pointer"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Minimize2 size={16} />
              </Button>
            </div>

            {/* Chat Area - Prevent Drag */}
            <div 
              className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4 scrollbar-thin scrollbar-thumb-gray-200"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-gray-800 text-white" : "bg-white text-blue-600 border border-blue-100"
                  )}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%]">
                   <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    <span className="text-xs text-gray-400">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Prevent Drag */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta algo sobre el libro..."
                className="flex-1 bg-gray-100 text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-10 w-10 shadow-md disabled:opacity-50 disabled:shadow-none"
              >
                <Send size={16} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (isOpen) {
            minimizeToDock();
          } else {
            setIsOpen(true);
          }
        }}
        className={cn(
            "h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 cursor-pointer pointer-events-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white animate-bounce-subtle",
            isOpen ? "bg-gray-200 text-gray-600 rotate-90 !bg-none" : ""
        )}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>
    </motion.div>
  );
});

AiTutorWidget.displayName = "AiTutorWidget";

export default AiTutorWidget;

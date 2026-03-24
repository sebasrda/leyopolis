"use client";

import React, { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
    role: 'user' | 'ai';
    content: string;
}

export default function AiTutor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '¡Hola! Soy tu tutor inteligente de Leyopolis. ¿En qué puedo ayudarte hoy con tus lecturas?' }
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);
    setInputValue("");
    
    // Simulación de respuesta IA
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: 'Entiendo tu pregunta. Como tutor IA, puedo ayudarte a analizar el texto, explicar conceptos difíciles o crear cuestionarios de práctica. ¿Qué prefieres?' 
      }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden pointer-events-auto flex flex-col"
            style={{ maxHeight: '600px' }} // Limit height
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Tutor Leyopolis</h3>
                  <p className="text-xs text-indigo-200">Siempre activo</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-50 h-80">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-white border-t flex gap-2 shrink-0">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu duda..." 
                className="flex-1 focus-visible:ring-indigo-500"
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-colors pointer-events-auto relative group z-[101]"
      >
        <Bot size={28} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        
        {!isOpen && (
            <div className="absolute right-full mr-4 bg-white px-3 py-1.5 rounded-lg shadow-lg text-sm text-gray-700 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                ¡Hola! ¿Ayuda?
            </div>
        )}
      </motion.button>
    </div>
  );
}

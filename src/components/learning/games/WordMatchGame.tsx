"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

export function WordMatchGame() {
  const [pairs, setPairs] = useState<{word: string, def: string}[]>([]);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    const data = [
      { word: "Efímero", def: "Que dura poco tiempo o es pasajero." },
      { word: "Inefable", def: "Algo tan increíble que no se puede explicar con palabras." },
      { word: "Resiliencia", def: "Capacidad de adaptarse frente a situaciones adversas." },
      { word: "Melancolía", def: "Tristeza vaga, profunda y permanente." }
    ];
    setPairs(data);
    setShuffledDefs(data.map((item, idx) => ({ id: idx, text: item.def })).sort(() => Math.random() - 0.5));
  }, []);

  const handleWordClick = (idx: number) => {
    if (matched.includes(idx)) return;
    setSelectedWord(idx);
  };

  const handleDefClick = (id: number) => {
    if (selectedWord === null) return;
    if (selectedWord === id) {
      setMatched([...matched, id]);
      setSelectedWord(null);
    } else {
      // Error feedback could go here
      setSelectedWord(null);
    }
  };

  if (matched.length === pairs.length && pairs.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-orange-100 p-8 rounded-full mb-6">
          <Lightbulb className="h-16 w-16 text-orange-500" />
        </div>
        <h3 className="text-3xl font-bold mb-4">¡Conexión Perfecta!</h3>
        <p className="text-gray-600 mb-8">Has dominado el vocabulario.</p>
        <Button onClick={() => setMatched([])} className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-4 rounded-full">
          Reiniciar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-4">
          <h4 className="font-bold text-gray-500 mb-4 text-center uppercase tracking-widest">Palabras</h4>
          {pairs.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleWordClick(idx)}
              className={`p-6 rounded-xl cursor-pointer border-2 transition-all ${
                matched.includes(idx) 
                  ? "bg-green-100 border-green-400 opacity-50" 
                  : selectedWord === idx 
                    ? "bg-orange-100 border-orange-500 shadow-md" 
                    : "bg-white border-gray-200 hover:border-orange-300"
              }`}
            >
              <span className="font-bold text-lg text-gray-800">{item.word}</span>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-500 mb-4 text-center uppercase tracking-widest">Significados</h4>
          {shuffledDefs.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleDefClick(item.id)}
              className={`p-6 rounded-xl cursor-pointer border-2 transition-all ${
                matched.includes(item.id) 
                  ? "bg-green-100 border-green-400 opacity-50" 
                  : "bg-white border-gray-200 hover:border-orange-300"
              }`}
            >
              <span className="text-sm text-gray-600 leading-snug">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

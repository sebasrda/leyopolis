"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ScrambleSentence {
  id: number;
  sentence: string; // The correct sentence
  scrambled?: string[]; // Optional pre-scrambled, otherwise we shuffle automatically
}

interface WordScrambleGameProps {
  sentences: ScrambleSentence[];
  onComplete: (score: number, maxScore: number) => void;
  onExit?: () => void;
}

export function WordScrambleGame({ sentences, onComplete, onExit }: WordScrambleGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameFinished, setGameFinished] = useState(false);

  // Initialize first sentence
  useEffect(() => {
    loadSentence(0);
  }, []);

  const loadSentence = (index: number) => {
    if (index >= sentences.length) {
      setGameFinished(true);
      onComplete(score, sentences.length);
      return;
    }

    const sentence = sentences[index].sentence;
    // Remove punctuation for easier matching if needed, but keeping it adds challenge
    const words = sentence.split(' ');
    
    // Shuffle words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    
    setCurrentWords(shuffled);
    setSelectedWords([]);
    setIsCorrect(null);
    setShowResult(false);
  };

  const handleWordClick = (word: string, index: number) => {
    // Move word from pool to selected
    const newCurrent = [...currentWords];
    newCurrent.splice(index, 1);
    setCurrentWords(newCurrent);
    setSelectedWords([...selectedWords, word]);
  };

  const handleSelectedClick = (word: string, index: number) => {
    // Move word back to pool
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setCurrentWords([...currentWords, word]);
  };

  const checkAnswer = () => {
    const constructedSentence = selectedWords.join(' ');
    const correctSentence = sentences[currentIndex].sentence;
    
    if (constructedSentence === correctSentence) {
      setIsCorrect(true);
      setScore(prev => prev + 1);
    } else {
      setIsCorrect(false);
    }
    setShowResult(true);
  };

  const nextSentence = () => {
    setCurrentIndex(prev => {
        const next = prev + 1;
        loadSentence(next);
        return next;
    });
  };

  const resetCurrent = () => {
    loadSentence(currentIndex);
  };

  if (gameFinished) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full"
        >
          <h2 className="text-3xl font-bold text-indigo-700 mb-4">¡Juego Completado!</h2>
          <div className="text-6xl mb-6">🎉</div>
          <p className="text-xl text-gray-600 mb-2">Tu puntuación:</p>
          <p className="text-4xl font-bold text-indigo-600 mb-8">{score} / {sentences.length}</p>
          
          <Button 
            onClick={onExit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg py-6 rounded-xl"
          >
            Volver al Hub
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 flex flex-col h-full">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-8">
        <motion.div 
          className="h-full bg-indigo-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / sentences.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <h3 className="text-xl font-medium text-gray-500 mb-8 text-center">
          Ordena las palabras para formar la frase correcta
        </h3>

        {/* Answer Area */}
        <div className="w-full min-h-[120px] bg-white border-2 border-indigo-100 rounded-2xl p-6 mb-8 flex flex-wrap gap-2 items-center justify-center shadow-sm">
          {selectedWords.length === 0 && !showResult && (
            <span className="text-gray-300 italic">Toca las palabras abajo para construir la frase...</span>
          )}
          
          <AnimatePresence>
            {selectedWords.map((word, idx) => (
              <motion.button
                key={`${word}-${idx}`}
                layoutId={`word-${word}-${idx}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => !showResult && handleSelectedClick(word, idx)}
                className={`px-4 py-2 bg-indigo-100 text-indigo-800 rounded-xl font-medium shadow-sm hover:bg-indigo-200 transition-colors ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {word}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Word Pool */}
        <div className="flex flex-wrap gap-3 justify-center mb-12 min-h-[100px]">
          <AnimatePresence>
            {currentWords.map((word, idx) => (
              <motion.button
                key={`${word}-pool-${idx}`}
                layoutId={`word-pool-${word}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                onClick={() => handleWordClick(word, idx)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95"
              >
                {word}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex gap-4 w-full max-w-md">
          {!showResult ? (
            <>
              <Button 
                variant="outline" 
                onClick={resetCurrent}
                className="flex-1 py-6 text-gray-500"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
              </Button>
              <Button 
                onClick={checkAnswer}
                disabled={selectedWords.length === 0}
                className="flex-[2] py-6 bg-indigo-600 hover:bg-indigo-700 text-lg"
              >
                Comprobar
              </Button>
            </>
          ) : (
            <div className={`w-full p-4 rounded-xl flex items-center justify-between ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="flex items-center gap-3">
                {isCorrect ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                <div>
                  <p className="font-bold text-lg">{isCorrect ? '¡Correcto!' : 'Incorrecto'}</p>
                  {!isCorrect && (
                    <p className="text-sm opacity-80 mt-1">
                      Respuesta: <strong>{sentences[currentIndex].sentence}</strong>
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={nextSentence} className="bg-white text-gray-900 hover:bg-gray-50">
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

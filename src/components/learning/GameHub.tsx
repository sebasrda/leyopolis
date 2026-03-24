
"use client";

import React, { useState, useEffect } from 'react';
import { useGamification } from '@/context/GamificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Award, Brain, Target, BookOpen } from 'lucide-react';
import { QuizGame, QuizQuestion } from './games/QuizGame';
import { MemoryGame } from './games/MemoryGame';
import { WordScrambleGame, ScrambleSentence } from './games/WordScrambleGame';
import { WordSearchGame } from './games/WordSearchGame';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Game {
    id: string;
    title: string;
    type: 'quiz' | 'memory' | 'order' | 'search';
    difficulty: 'Easy' | 'Medium' | 'Hard';
    xpReward: number;
    completed: boolean;
    description: string;
    data?: any; 
}

export default function GameHub() {
    const { progress, completeGame } = useGamification();
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [games, setGames] = useState<Game[]>([]);

    // In a real app, we would fetch games from an API based on user's books and progress.
    // For now, since we removed mock data, we start with an empty list.
    // Future implementation: fetch('/api/games')
    
    const handleGameComplete = (score: number, maxScore: number) => {
        if (selectedGame) {
            completeGame(selectedGame.id, score, maxScore);
            setTimeout(() => setSelectedGame(null), 2000); // Close after 2s
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Centro de Aprendizaje Gamificado</h1>
                    <p className="opacity-90">Completa desafíos para subir de nivel.</p>
                </div>
                
                <div className="flex gap-6 mt-4 md:mt-0">
                    <div className="text-center bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-sm opacity-75">Nivel</div>
                        <div className="text-2xl font-bold">{progress.level}</div>
                    </div>
                    <div className="text-center bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-sm opacity-75">XP Total</div>
                        <div className="text-2xl font-bold">{progress.xp}</div>
                    </div>
                    <div className="text-center bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-sm opacity-75">Racha</div>
                        <div className="text-2xl font-bold">🔥 {progress.streakDays}</div>
                    </div>
                </div>
            </div>

            {/* Game Grid */}
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Target className="text-indigo-600" />
                Desafíos Disponibles
            </h2>
            
            {games.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay desafíos disponibles</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Los juegos y desafíos se desbloquean a medida que lees libros. ¡Ve a la biblioteca y empieza una nueva lectura!
                    </p>
                    <Link href="/dashboard/library">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <BookOpen className="mr-2 h-4 w-4" /> Ir a la Biblioteca
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {games.map((game) => (
                        <motion.div
                            key={game.id}
                            whileHover={{ y: -5 }}
                            className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${
                                game.difficulty === 'Easy' ? 'border-green-400' :
                                game.difficulty === 'Medium' ? 'border-yellow-400' : 'border-red-400'
                            }`}
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        game.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                        game.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                        {game.difficulty}
                                    </span>
                                    <div className="flex items-center text-indigo-600 text-sm font-semibold">
                                        <Award size={16} className="mr-1" />
                                        {game.xpReward} XP
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{game.title}</h3>
                                <p className="text-gray-600 text-sm mb-4">{game.description}</p>
                                
                                <button
                                    onClick={() => setSelectedGame(game)}
                                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Play size={16} fill="currentColor" />
                                    Jugar Ahora
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Game Modal Placeholder */}
            <AnimatePresence>
                {selectedGame && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{selectedGame.title}</h3>
                                    <p className="text-sm text-gray-500">Objetivo: {selectedGame.xpReward} XP</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedGame(null)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Game Content Area */}
                            <div className="flex-1 p-8 flex items-center justify-center bg-gray-100 overflow-y-auto">
                                {selectedGame.type === 'quiz' ? (
                                    <QuizGame 
                                        questions={selectedGame.data as QuizQuestion[]} 
                                        onComplete={handleGameComplete} 
                                        onExit={() => setSelectedGame(null)} 
                                    />
                                ) : selectedGame.type === 'memory' ? (
                                    <MemoryGame 
                                        pairs={selectedGame.data} 
                                        onComplete={handleGameComplete} 
                                    />
                                ) : selectedGame.type === 'order' ? (
                                    <WordScrambleGame 
                                        sentences={selectedGame.data} 
                                        onComplete={handleGameComplete} 
                                        onExit={() => setSelectedGame(null)}
                                    />
                                ) : selectedGame.type === 'search' ? (
                                    <WordSearchGame 
                                        words={selectedGame.data}
                                        onComplete={handleGameComplete}
                                        onExit={() => setSelectedGame(null)}
                                    />
                                ) : (
                                    <div className="text-center">
                                        <Brain size={64} className="mx-auto text-indigo-300 mb-4" />
                                        <h2 className="text-2xl font-bold text-gray-700 mb-2">
                                            Próximamente
                                        </h2>
                                        <p className="text-gray-500">
                                            El juego <strong>{selectedGame.title}</strong> está en desarrollo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

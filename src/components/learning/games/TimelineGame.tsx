"use client";

import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle, RefreshCw, MoveUp, MoveDown, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineEvent {
    id: string;
    text: string;
    description?: string;
}

interface TimelineGameProps {
    events: string[]; // Initially comes as a simple array of strings in chronological order
    onComplete: (score: number, maxScore: number) => void;
}

export function TimelineGame({ events, onComplete }: TimelineGameProps) {
    const [items, setItems] = useState<TimelineEvent[]>([]);
    const [originalIds, setOriginalIds] = useState<string[]>([]);
    const [timer, setTimer] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Initialize Game
    useEffect(() => {
        if (!events || events.length === 0) return;

        const initialItems = events.map((text, index) => ({
            id: `event-${index}`,
            text
        }));
        
        // Save original order IDs
        setOriginalIds(initialItems.map(i => i.id));

        // Shuffle items
        const shuffled = [...initialItems].sort(() => Math.random() - 0.5);
        setItems(shuffled);
        setIsPlaying(true);
        setTimer(0);
        setShowResults(false);
    }, [events]);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && !showResults) {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, showResults]);

    const checkOrder = () => {
        const currentIds = items.map(item => item.id);
        const isCorrect = JSON.stringify(currentIds) === JSON.stringify(originalIds);
        
        if (isCorrect) {
            setShowResults(true);
            setIsPlaying(false);
            // Calculate Score: base 1000 - time penalty
            const finalScore = Math.max(100, 1000 - (timer * 5));
            onComplete(finalScore, 1000);
        } else {
            alert("El orden aún no es correcto. ¡Sigue intentando!");
        }
    };

    if (!events || events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="bg-card dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border-2 border-indigo-50 dark:border-indigo-900/20">
                    <History className="h-12 w-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground dark:text-gray-400 italic">No hay suficientes eventos cronológicos para este libro.</p>
                </div>
            </div>
        );
    }

    if (showResults) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-card dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full border-4 border-emerald-500/20"
                >
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-12 w-12 text-emerald-600" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-foreground dark:text-white mb-2">¡Perfecto!</h2>
                    <p className="text-xl text-emerald-600 font-medium mb-6">Has reconstruido la historia correctamente</p>
                    <div className="bg-muted dark:bg-gray-900/50 p-6 rounded-2xl mb-8">
                        <p className="text-sm text-muted-foreground dark:text-gray-400 uppercase tracking-widest font-bold mb-1">Tiempo total</p>
                        <p className="text-5xl font-black text-indigo-400">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
                    </div>
                    <Button 
                        onClick={() => window.location.reload()} // Simplified for verification
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl py-8 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Volver a Biblioteca
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full h-full p-4 overflow-y-auto">
            <div className="max-w-3xl w-full flex flex-col gap-6">
                
                {/* Header Stats */}
                <div className="flex justify-between items-center bg-card dark:bg-gray-800 p-4 px-8 rounded-2xl border border-indigo-500/50/20 dark:border-indigo-900/30 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 text-indigo-400 dark:text-indigo-400">
                        <Timer size={20} />
                        <span className="font-mono text-2xl font-bold">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Ordena los hechos</span>
                        <div className="p-2 bg-indigo-500/10 dark:bg-indigo-900/30 rounded-lg">
                            <History className="h-5 w-5 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <p className="text-center text-muted-foreground text-sm italic mb-2">Arrastra los eventos para ponerlos en orden cronológico real (lo que pasó primero arriba).</p>

                {/* Reorderable List */}
                <Reorder.Group axis="y" values={items} onReorder={setItems} className="flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                        {items.map((item, index) => (
                            <Reorder.Item
                                key={item.id}
                                value={item}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                whileDrag={{ scale: 1.05, boxShadow: "0px 10px 30px rgba(0,0,0,0.1)" }}
                                className="cursor-grab active:cursor-grabbing"
                            >
                                <div className="bg-card dark:bg-gray-800 p-6 rounded-2xl border-2 border-border dark:border-gray-700 flex items-center gap-5 group hover:border-indigo-500/50/50 transition-colors shadow-sm">
                                    <div className="flex flex-col items-center justify-center p-3 bg-muted dark:bg-gray-900 rounded-xl group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-900/20 transition-colors">
                                        <span className="text-lg font-bold text-gray-400 group-hover:text-indigo-500">{index + 1}</span>
                                    </div>
                                    <p className="flex-1 text-lg font-medium text-foreground dark:text-gray-200">{item.text}</p>
                                    <div className="text-gray-300 group-hover:text-indigo-500 flex flex-col gap-1 transition-colors">
                                        <MoveUp size={16} />
                                        <MoveDown size={16} />
                                    </div>
                                </div>
                            </Reorder.Item>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>

                <div className="pt-8 pb-12 flex justify-center">
                    <Button 
                        size="lg" 
                        onClick={checkOrder}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-8 rounded-2xl text-xl font-bold shadow-xl shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 flex gap-2"
                    >
                        <CheckCircle size={24} />
                        Confirmar Orden
                    </Button>
                </div>
            </div>
        </div>
    );
}

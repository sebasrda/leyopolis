
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Timer } from 'lucide-react';

interface MemoryCard {
    id: number;
    content: string; // Text or Image URL
    type: 'character' | 'description';
    matchId: number; // ID of the matching card
    isFlipped: boolean;
    isMatched: boolean;
}

interface MemoryGameProps {
    pairs: { character: string, description: string }[];
    onComplete: (score: number, maxScore: number) => void;
}

export function MemoryGame({ pairs, onComplete }: MemoryGameProps) {
    const [cards, setCards] = useState<MemoryCard[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matches, setMatches] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [timer, setTimer] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Initialize Game
    useEffect(() => {
        const newCards: MemoryCard[] = [];
        pairs.forEach((pair, index) => {
            // Card 1: Character
            newCards.push({
                id: index * 2,
                content: pair.character,
                type: 'character',
                matchId: index,
                isFlipped: false,
                isMatched: false
            });
            // Card 2: Description
            newCards.push({
                id: index * 2 + 1,
                content: pair.description,
                type: 'description',
                matchId: index,
                isFlipped: false,
                isMatched: false
            });
        });

        // Shuffle
        for (let i = newCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
        }

        setCards(newCards);
        setIsPlaying(true);
    }, [pairs]);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && matches < pairs.length) {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, matches, pairs.length]);

    const handleCardClick = (id: number) => {
        if (isLocked) return;
        
        const cardIndex = cards.findIndex(c => c.id === id);
        if (cards[cardIndex].isFlipped || cards[cardIndex].isMatched) return;

        // Flip card
        const newCards = [...cards];
        newCards[cardIndex].isFlipped = true;
        setCards(newCards);

        const newFlipped = [...flippedCards, cardIndex];
        setFlippedCards(newFlipped);

        if (newFlipped.length === 2) {
            setIsLocked(true);
            setMoves(moves + 1);
            checkForMatch(newFlipped, newCards);
        }
    };

    const checkForMatch = (flippedIndices: number[], currentCards: MemoryCard[]) => {
        const [index1, index2] = flippedIndices;
        const card1 = currentCards[index1];
        const card2 = currentCards[index2];

        if (card1.matchId === card2.matchId) {
            // Match found
            setTimeout(() => {
                const matchedCards = [...currentCards];
                matchedCards[index1].isMatched = true;
                matchedCards[index2].isMatched = true;
                setCards(matchedCards);
                setFlippedCards([]);
                setIsLocked(false);
                setMatches(matches + 1);

                if (matches + 1 === pairs.length) {
                    handleGameOver();
                }
            }, 500);
        } else {
            // No match
            setTimeout(() => {
                const resetCards = [...currentCards];
                resetCards[index1].isFlipped = false;
                resetCards[index2].isFlipped = false;
                setCards(resetCards);
                setFlippedCards([]);
                setIsLocked(false);
            }, 1000);
        }
    };

    const handleGameOver = () => {
        setIsPlaying(false);
        // Calculate Score based on moves and time
        // Base score 1000. Minus 10 per second. Minus 50 per extra move.
        const baseScore = 1000;
        const timePenalty = timer * 2;
        const movePenalty = (moves - pairs.length) * 10;
        const finalScore = Math.max(100, baseScore - timePenalty - movePenalty);
        
        onComplete(finalScore, 1000);
    };

    return (
        <div className="flex flex-col items-center w-full h-full p-4">
            {/* Header */}
            <div className="flex justify-between w-full max-w-4xl mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                    <Timer size={20} />
                    <span className="font-mono text-xl">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
                </div>
                <div className="text-gray-600 font-bold">
                    Movimientos: {moves}
                </div>
                <div className="text-indigo-600 font-bold">
                    Pares: {matches} / {pairs.length}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl flex-1 overflow-y-auto p-2">
                {cards.map((card) => (
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
                        onClick={() => handleCardClick(card.id)}
                        className={`relative aspect-[3/4] cursor-pointer perspective-1000`}
                    >
                        <motion.div
                            className={`w-full h-full rounded-xl shadow-md flex items-center justify-center p-4 text-center transition-all duration-500 transform-style-3d ${
                                card.isFlipped || card.isMatched ? 'rotate-y-180 bg-white border-2 border-indigo-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                            }`}
                            animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                        >
                            {/* Front (Hidden) */}
                            <div className="absolute inset-0 backface-hidden flex items-center justify-center">
                                <span className="text-white text-4xl font-bold opacity-20">?</span>
                            </div>

                            {/* Back (Visible) */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-2 bg-white rounded-xl">
                                <span className={`text-sm md:text-base font-medium ${card.isMatched ? 'text-green-600' : 'text-gray-800'}`}>
                                    {card.content}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

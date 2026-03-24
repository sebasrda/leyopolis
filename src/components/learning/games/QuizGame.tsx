
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number; // Index 0-3
    explanation?: string;
}

interface QuizGameProps {
    questions: QuizQuestion[];
    onComplete: (score: number, maxScore: number) => void;
    onExit: () => void;
}

export function QuizGame({ questions, onComplete, onExit }: QuizGameProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        if (index === questions[currentQuestion].correctAnswer) {
            setScore(score + 10);
        }
    };

    const handleNext = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setShowResults(true);
        }
    };

    const maxScore = questions.length * 10;

    if (showResults) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in">
                <h2 className="text-3xl font-bold mb-4 text-gray-800">¡Juego Completado!</h2>
                <div className="text-6xl font-black text-indigo-600 mb-2">{score} <span className="text-2xl text-gray-400">/ {maxScore} XP</span></div>
                <p className="text-gray-500 mb-8">Has demostrado gran comprensión lectora.</p>
                
                <div className="flex gap-4">
                    <Button onClick={onExit} variant="outline" className="w-32">Salir</Button>
                    <Button onClick={() => onComplete(score, maxScore)} className="w-32 bg-indigo-600 hover:bg-indigo-700 text-white">
                        Reclamar XP
                    </Button>
                </div>
            </div>
        );
    }

    const question = questions[currentQuestion];

    return (
        <div className="w-full max-w-2xl mx-auto h-full flex flex-col p-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                    {question.question}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {question.options.map((option, index) => {
                        let buttonStyle = "bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700";
                        
                        if (isAnswered) {
                            if (index === question.correctAnswer) {
                                buttonStyle = "bg-green-100 border-green-500 text-green-800 font-bold";
                            } else if (selectedOption === index) {
                                buttonStyle = "bg-red-100 border-red-500 text-red-800";
                            } else {
                                buttonStyle = "bg-gray-50 border-gray-100 text-gray-400 opacity-50";
                            }
                        } else if (selectedOption === index) {
                            buttonStyle = "bg-indigo-50 border-indigo-500 text-indigo-700";
                        }

                        return (
                            <motion.button
                                key={index}
                                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                onClick={() => handleOptionSelect(index)}
                                disabled={isAnswered}
                                className={`p-4 rounded-xl text-left transition-all duration-200 flex justify-between items-center ${buttonStyle}`}
                            >
                                <span>{option}</span>
                                {isAnswered && index === question.correctAnswer && <Check size={20} className="text-green-600" />}
                                {isAnswered && selectedOption === index && index !== question.correctAnswer && <X size={20} className="text-red-600" />}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 h-16 flex justify-end items-center">
                {isAnswered && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Button 
                            onClick={handleNext} 
                            className="px-8 py-6 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200"
                        >
                            {currentQuestion < questions.length - 1 ? "Siguiente Pregunta" : "Ver Resultados"}
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

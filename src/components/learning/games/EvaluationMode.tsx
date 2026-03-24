"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

interface EvaluationModeProps {
  onClose: () => void;
}

export function EvaluationMode({ onClose }: EvaluationModeProps) {
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const questions = [
    {
      id: 1,
      question: "¿Cuál es el conflicto principal de la historia?",
      options: ["Hombre contra naturaleza", "Hombre contra sociedad", "Hombre contra sí mismo", "Bien contra mal"],
      correct: 2
    },
    {
      id: 2,
      question: "¿Cómo evoluciona el protagonista?",
      options: ["Se vuelve más cínico", "Aprende a perdonar", "Pierde la memoria", "Gana poderes mágicos"],
      correct: 1
    },
    {
      id: 3,
      question: "¿Qué rol juega el antagonista?",
      options: ["Es un obstáculo físico", "Representa el pasado", "Es un aliado secreto", "No existe antagonista"],
      correct: 1
    },
    {
      id: 4,
      question: "¿Cuál es el tono predominante?",
      options: ["Satírico", "Melancólico", "Optimista", "Terrorífico"],
      correct: 1
    }
  ];

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correct) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  if (submitted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-emerald-100">
          <div className="mb-6 inline-flex p-4 bg-emerald-100 rounded-full">
            <GraduationCap className="h-16 w-16 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Evaluación Completada</h2>
          <p className="text-gray-500 mb-8">Has finalizado el examen del libro.</p>
          
          <div className="text-6xl font-black text-emerald-600 mb-2">{percentage}%</div>
          <p className="text-xl font-medium text-gray-700 mb-8">
            {score} de {questions.length} respuestas correctas
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button onClick={onClose} variant="outline" className="border-gray-300">
              Cerrar
            </Button>
            {percentage < 70 && (
              <Button onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setScore(0);
              }} className="bg-emerald-600 hover:bg-emerald-700">
                Intentar de Nuevo
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full pb-10">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 flex items-start gap-4">
        <GraduationCap className="h-6 w-6 text-emerald-600 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-emerald-900">Instrucciones</h4>
          <p className="text-emerald-700 text-sm">Responde todas las preguntas cuidadosamente. Al finalizar, recibirás tu calificación inmediata. Necesitas un 70% para aprobar.</p>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q: any, idx: number) => (
          <Card key={idx} className="overflow-hidden border-gray-200 shadow-sm">
            <div className="bg-gray-50 p-4 border-b border-gray-100 flex gap-3">
              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <h3 className="font-medium text-gray-900">{q.question}</h3>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {q.options.map((opt: string, optIdx: number) => (
                <label 
                  key={optIdx} 
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    answers[idx] === optIdx 
                      ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" 
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    answers[idx] === optIdx ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
                  }`}>
                    {answers[idx] === optIdx && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm text-gray-700">{opt}</span>
                  <input 
                    type="radio" 
                    name={`q-${idx}`} 
                    className="hidden" 
                    onChange={() => setAnswers({...answers, [idx]: optIdx})}
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={Object.keys(answers).length < questions.length}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-200"
        >
          Entregar Evaluación
        </Button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, PenTool } from 'lucide-react';

export function CrosswordGame() {
  const initialGrid = [
    ['', '', '', '', '', '', '', ''],
    ['', 'M', 'A', 'P', 'A', '', '', ''], // MAPA
    ['', 'A', '', '', '', '', '', ''],
    ['', 'R', '', '', '', '', '', ''],
    ['', '', '', 'I', 'S', 'L', 'A', ''], // ISLA
    ['', '', '', '', '', 'O', '', ''],
    ['', '', '', '', '', 'R', '', ''],
    ['', '', '', '', '', 'O', '', ''],
  ];

  const solution = [
    ['', '', '', '', '', '', '', ''],
    ['', 'M', 'A', 'P', 'A', '', '', ''],
    ['', 'A', '', '', '', '', '', ''],
    ['', 'R', '', '', '', '', '', ''],
    ['', '', '', 'I', 'S', 'L', 'A', ''],
    ['', '', '', '', '', 'O', '', ''],
    ['', '', '', '', '', 'R', '', ''],
    ['', '', '', '', '', 'O', '', ''],
  ];

  const [userGrid, setUserGrid] = useState<string[][]>(
    Array(8).fill(null).map(() => Array(8).fill(''))
  );
  
  const [solved, setSolved] = useState(false);

  const handleInput = (r: number, c: number, val: string) => {
    if (val.length > 1) return;
    const newGrid = [...userGrid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = val.toUpperCase();
    setUserGrid(newGrid);
  };

  const checkSolution = () => {
    let isCorrect = true;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (solution[i][j] !== '' && userGrid[i][j] !== solution[i][j]) {
          isCorrect = false;
        }
      }
    }
    if (isCorrect) setSolved(true);
  };

  if (solved) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Trophy className="h-24 w-24 text-teal-500 mb-6 animate-pulse" />
        <h3 className="text-3xl font-bold mb-4">¡Crucigrama Resuelto!</h3>
        <p className="text-gray-600 mb-8">Has completado el desafío.</p>
        <Button onClick={() => {
            setUserGrid(Array(8).fill(null).map(() => Array(8).fill('')));
            setSolved(false);
        }} className="bg-teal-600 hover:bg-teal-700 text-lg px-8 py-4 rounded-full">
          Reiniciar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start justify-center max-w-5xl mx-auto h-full overflow-y-auto">
       {/* Grid */}
       <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-teal-100 flex-shrink-0">
         <div className="grid grid-cols-8 gap-1 select-none bg-gray-800 p-2 rounded-lg">
            {initialGrid.map((row, r) => (
                row.map((cell, c) => {
                    const isPlayable = solution[r][c] !== '';
                    return (
                        <div 
                            key={`${r}-${c}`}
                            className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm ${
                                isPlayable ? "bg-white" : "bg-transparent"
                            }`}
                        >
                            {isPlayable ? (
                                <input 
                                    type="text"
                                    maxLength={1}
                                    className="w-full h-full text-center font-bold text-xl uppercase focus:bg-yellow-100 outline-none rounded-sm text-gray-800"
                                    value={userGrid[r][c]}
                                    onChange={(e) => handleInput(r, c, e.target.value)}
                                />
                            ) : null}
                        </div>
                    );
                })
            ))}
         </div>
         <div className="mt-4 flex justify-center">
             <Button onClick={checkSolution} className="bg-teal-600 hover:bg-teal-700 text-white">
                 Verificar Solución
             </Button>
         </div>
       </div>

       {/* Clues */}
       <div className="w-full md:w-80 bg-white p-6 rounded-2xl shadow-md border-2 border-teal-100 flex-col flex">
            <h4 className="font-bold text-lg mb-4 text-teal-600 flex items-center gap-2">
                <PenTool size={20} />
                Pistas
            </h4>
            
            <div className="space-y-6 overflow-y-auto flex-1">
                <div>
                    <h5 className="font-bold text-gray-700 mb-2 border-b pb-1">Horizontales</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <span className="font-bold bg-teal-100 text-teal-700 w-5 h-5 flex items-center justify-center rounded-full text-xs">1</span>
                            Guía de papel para encontrar tesoros. (4 letras)
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold bg-teal-100 text-teal-700 w-5 h-5 flex items-center justify-center rounded-full text-xs">2</span>
                            Tierra rodeada de agua por todas partes. (4 letras)
                        </li>
                    </ul>
                </div>

                <div>
                    <h5 className="font-bold text-gray-700 mb-2 border-b pb-1">Verticales</h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex gap-2">
                            <span className="font-bold bg-teal-100 text-teal-700 w-5 h-5 flex items-center justify-center rounded-full text-xs">1</span>
                            Masa de agua salada que cubre gran parte de la Tierra. (3 letras)
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold bg-teal-100 text-teal-700 w-5 h-5 flex items-center justify-center rounded-full text-xs">3</span>
                            Ave colorida que suele repetir palabras. (4 letras)
                        </li>
                    </ul>
                </div>
            </div>
       </div>
    </div>
  );
}

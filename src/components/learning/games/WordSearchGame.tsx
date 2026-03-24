"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface WordSearchProps {
  words: string[]; // Words to find
  gridSize?: number; // Size of the grid (e.g., 10 for 10x10)
  onComplete: (score: number, maxScore: number) => void;
  onExit?: () => void;
}

interface Cell {
  letter: string;
  x: number;
  y: number;
  selected: boolean;
  found: boolean;
}

export function WordSearchGame({ words = ["LEYOPOLIS", "LIBRO", "JUEGO"], gridSize = 10, onComplete, onExit }: WordSearchProps) {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{x: number, y: number}[]>([]);
  const [gameWon, setGameFinished] = useState(false);

  // Initialize Grid
  useEffect(() => {
    initializeGrid();
  }, []);

  const initializeGrid = () => {
    // 1. Create empty grid
    const newGrid: Cell[][] = Array(gridSize).fill(null).map((_, y) => 
      Array(gridSize).fill(null).map((_, x) => ({
        letter: '',
        x,
        y,
        selected: false,
        found: false
      }))
    );

    // 2. Place words
    const placedWords: string[] = [];
    
    // Sort words by length desc to place hardest first
    const wordsToPlace = [...words].map(w => w.toUpperCase()).sort((a, b) => b.length - a.length);

    for (const word of wordsToPlace) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
        const startX = Math.floor(Math.random() * gridSize);
        const startY = Math.floor(Math.random() * gridSize);
        
        if (canPlaceWord(newGrid, word, startX, startY, direction)) {
          placeWord(newGrid, word, startX, startY, direction);
          placed = true;
          placedWords.push(word);
        }
        attempts++;
      }
    }

    // 3. Fill empty spots with random letters
    const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (newGrid[y][x].letter === '') {
          newGrid[y][x].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    setGrid(newGrid);
    setFoundWords([]);
    setGameFinished(false);
  };

  const canPlaceWord = (grid: Cell[][], word: string, x: number, y: number, direction: number) => {
    if (direction === 0) { // Horizontal
      if (x + word.length > gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        if (grid[y][x + i].letter !== '' && grid[y][x + i].letter !== word[i]) return false;
      }
    } else if (direction === 1) { // Vertical
      if (y + word.length > gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        if (grid[y + i][x].letter !== '' && grid[y + i][x].letter !== word[i]) return false;
      }
    } else { // Diagonal
      if (x + word.length > gridSize || y + word.length > gridSize) return false;
      for (let i = 0; i < word.length; i++) {
        if (grid[y + i][x + i].letter !== '' && grid[y + i][x + i].letter !== word[i]) return false;
      }
    }
    return true;
  };

  const placeWord = (grid: Cell[][], word: string, x: number, y: number, direction: number) => {
    for (let i = 0; i < word.length; i++) {
      if (direction === 0) grid[y][x + i].letter = word[i];
      else if (direction === 1) grid[y + i][x].letter = word[i];
      else grid[y + i][x + i].letter = word[i];
    }
  };

  // Interaction Handlers
  const handleMouseDown = (x: number, y: number) => {
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection([{ x, y }]);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!isSelecting || !selectionStart) return;

    // Calculate line from start to current
    // Only allow straight lines (horizontal, vertical, diagonal)
    const dx = x - selectionStart.x;
    const dy = y - selectionStart.y;

    let newSelection: {x: number, y: number}[] = [];

    if (dx === 0) { // Vertical
      const step = dy > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dy); i++) {
        newSelection.push({ x: selectionStart.x, y: selectionStart.y + (i * step) });
      }
    } else if (dy === 0) { // Horizontal
      const step = dx > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dx); i++) {
        newSelection.push({ x: selectionStart.x + (i * step), y: selectionStart.y });
      }
    } else if (Math.abs(dx) === Math.abs(dy)) { // Diagonal
      const stepX = dx > 0 ? 1 : -1;
      const stepY = dy > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dx); i++) {
        newSelection.push({ x: selectionStart.x + (i * stepX), y: selectionStart.y + (i * stepY) });
      }
    }

    if (newSelection.length > 0) {
        setCurrentSelection(newSelection);
    }
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Check if selection forms a word
    const selectedWord = currentSelection.map(pos => grid[pos.y][pos.x].letter).join('');
    const reversedWord = selectedWord.split('').reverse().join(''); // Support backwards selection

    const matchedWord = words.find(w => w.toUpperCase() === selectedWord || w.toUpperCase() === reversedWord);

    if (matchedWord && !foundWords.includes(matchedWord.toUpperCase())) {
      // Found a new word!
      const wordUpper = matchedWord.toUpperCase();
      setFoundWords(prev => {
        const newFound = [...prev, wordUpper];
        if (newFound.length === words.length) {
            setTimeout(() => setGameFinished(true), 500);
        }
        return newFound;
      });

      // Mark cells as found
      const newGrid = [...grid];
      currentSelection.forEach(pos => {
        newGrid[pos.y][pos.x].found = true;
      });
      setGrid(newGrid);
    }

    setCurrentSelection([]);
    setSelectionStart(null);
  };

  if (gameWon) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full"
        >
          <h2 className="text-3xl font-bold text-green-600 mb-4">¡Sopa Completada!</h2>
          <div className="text-6xl mb-6">🧠</div>
          <p className="text-gray-600 mb-8">Has encontrado todas las palabras.</p>
          <Button 
            onClick={() => onComplete(words.length * 10, words.length * 10)}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 rounded-xl"
          >
            Reclamar Recompensa
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start justify-center p-4 max-w-5xl mx-auto h-full" onMouseUp={handleMouseUp}>
      
      {/* Word List */}
      <div className="w-full md:w-64 bg-white p-6 rounded-2xl shadow-md border border-indigo-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            Palabras ({foundWords.length}/{words.length})
        </h3>
        <div className="flex flex-wrap gap-2">
            {words.map(word => {
                const isFound = foundWords.includes(word.toUpperCase());
                return (
                    <div 
                        key={word} 
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                            isFound 
                                ? 'bg-green-100 text-green-700 line-through opacity-60' 
                                : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                        {word}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Grid */}
      <div 
        className="bg-white p-4 rounded-2xl shadow-lg border-4 border-indigo-200 touch-none select-none"
        onMouseLeave={() => setIsSelecting(false)}
      >
        <div 
            className="grid gap-1"
            style={{ 
                gridTemplateColumns: `repeat(${gridSize}, minmax(30px, 40px))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(30px, 40px))`
            }}
        >
            {grid.map((row, y) => (
                row.map((cell, x) => {
                    const isSelected = currentSelection.some(pos => pos.x === x && pos.y === y);
                    return (
                        <div
                            key={`${x}-${y}`}
                            onMouseDown={() => handleMouseDown(x, y)}
                            onMouseEnter={() => handleMouseEnter(x, y)}
                            className={`
                                flex items-center justify-center text-lg font-bold rounded-md cursor-pointer transition-colors duration-150
                                ${cell.found ? 'bg-green-500 text-white animate-pulse' : ''}
                                ${isSelected ? 'bg-indigo-500 text-white transform scale-110 shadow-lg z-10' : ''}
                                ${!cell.found && !isSelected ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100' : ''}
                            `}
                        >
                            {cell.letter}
                        </div>
                    );
                })
            ))}
        </div>
      </div>
    </div>
  );
}

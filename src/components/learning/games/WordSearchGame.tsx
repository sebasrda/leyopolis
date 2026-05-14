"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, Grid3X3, HelpCircle } from 'lucide-react';

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

// Normalize a word for placement and matching in the grid:
//   "Tom Sawyer"  -> "TOMSAWYER"
//   "TÍA POLLY"   -> "TIAPOLLY"
//   "Misisipí"    -> "MISISIPI"
// Strips accents, removes spaces and any non-letter character so the grid
// is always 100% A-Z and lookups don't need to deal with diacritics.
function normalizeWord(w: string): string {
  return w
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z]/g, "");
}

export function WordSearchGame({ words = ["LEYOPOLIS", "LIBRO", "JUEGO"], gridSize = 12, onComplete, onExit }: WordSearchProps) {
  const [grid, setGrid] = useState<Cell[][]>([]);
  // displayedWords: original form for the side list. placedWords: grid form.
  const [displayedWords, setDisplayedWords] = useState<Array<{ display: string; placed: string }>>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]); // matches placed form
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{x: number, y: number}[]>([]);
  const [gameWon, setGameFinished] = useState(false);
  // Refs mirror state so handlers fire with the latest values even when
  // React hasn't committed the previous setState yet. This is what fixed the
  // 'last letter dropped from the selection' bug — mouseup used to read a
  // stale currentSelection that ended one cell short of where the user
  // released the pointer.
  const selectionStartRef = useRef<{x: number, y: number} | null>(null);
  const isSelectingRef = useRef(false);

  // Initialize Grid
  useEffect(() => {
    if (words && words.length > 0) {
      initializeGrid();
    }
  }, [words]);

  const initializeGrid = () => {
    if (!words || words.length === 0) return;

    // Pair each source word with its grid-ready (normalized) form. Skip
    // entries that normalize to empty (e.g., "—" or pure punctuation).
    const pairs = words
      .map((w) => ({ display: w.toString().trim(), placed: normalizeWord(String(w)) }))
      .filter((p) => p.display && p.placed.length >= 2);

    if (pairs.length === 0) return;

    // Adapt grid: grow if the longest word doesn't fit.
    const longestWord = Math.max(...pairs.map((p) => p.placed.length));
    const dynamicSize = Math.max(gridSize, longestWord + 2);

    // Weighted direction bag: pre-2024 we picked uniformly from 0-7 which
    // looked vertical-heavy on screen because horizontal lines stack in the
    // same row pool. Bag distribution: 5 horizontal entries, 3 vertical,
    // 3 diagonal -> roughly 45% horizontal / 27% vertical / 27% diagonal,
    // which matches how a hand-made word search would look.
    //   0=H→, 1=V↓, 2=D↘, 3=D↗, 4=H←, 5=V↑, 6=D↖, 7=D↙
    const DIRECTION_BAG = [0, 0, 0, 4, 4, 1, 1, 5, 2, 3, 7];
    const sorted = [...pairs].sort((a, b) => b.placed.length - a.placed.length);

    // Try up to 5 full-grid regenerations to make sure EVERY word gets placed.
    // Without this retry, a crowded board could leave the shortest word (last
    // in the list) unplaced, which made the user think "the last word is
    // missing from the grid".
    let newGrid: Cell[][] = [];
    let placedOk: Array<{ display: string; placed: string }> = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      newGrid = Array(dynamicSize).fill(null).map((_, y) =>
        Array(dynamicSize).fill(null).map((_, x) => ({
          letter: '',
          x,
          y,
          selected: false,
          found: false
        }))
      );
      placedOk = [];
      for (const entry of sorted) {
        const word = entry.placed;
        if (word.length > dynamicSize) continue;
        let placed = false;
        let tries = 0;
        while (!placed && tries < 400) {
          const direction = DIRECTION_BAG[Math.floor(Math.random() * DIRECTION_BAG.length)];
          const startX = Math.floor(Math.random() * dynamicSize);
          const startY = Math.floor(Math.random() * dynamicSize);
          if (canPlaceWord(newGrid, word, startX, startY, direction, dynamicSize)) {
            placeWord(newGrid, word, startX, startY, direction);
            placed = true;
            placedOk.push(entry);
          }
          tries++;
        }
      }
      // Bail out as soon as we get a grid that holds every word.
      if (placedOk.length === pairs.length) break;
    }

    // 3. Fill empty spots with random letters (A-Z only — matches placed form)
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let y = 0; y < dynamicSize; y++) {
      for (let x = 0; x < dynamicSize; x++) {
        if (newGrid[y][x].letter === '') {
          newGrid[y][x].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    setGrid(newGrid);
    setDisplayedWords(placedOk);
    setFoundWords([]);
    setGameFinished(false);
  };

  // 8 directions: 0=H→, 1=V↓, 2=D↘, 3=D↗, 4=H←, 5=V↑, 6=D↖, 7=D↙
  const DIR_DX = [1, 0, 1, 1, -1, 0, -1, -1];
  const DIR_DY = [0, 1, 1, -1, 0, -1, -1, 1];

  const canPlaceWord = (grid: Cell[][], word: string, x: number, y: number, direction: number, size: number) => {
    const dx = DIR_DX[direction];
    const dy = DIR_DY[direction];
    const endX = x + dx * (word.length - 1);
    const endY = y + dy * (word.length - 1);
    if (endX < 0 || endX >= size || endY < 0 || endY >= size) return false;
    for (let i = 0; i < word.length; i++) {
      const cx = x + dx * i;
      const cy = y + dy * i;
      const cell = grid[cy][cx].letter;
      if (cell !== '' && cell !== word[i]) return false;
    }
    return true;
  };

  const placeWord = (grid: Cell[][], word: string, x: number, y: number, direction: number) => {
    const dx = DIR_DX[direction];
    const dy = DIR_DY[direction];
    for (let i = 0; i < word.length; i++) {
      grid[y + dy * i][x + dx * i].letter = word[i];
    }
  };

  // Build a straight-line selection from (sx,sy) to (ex,ey). Returns [] if
  // the two cells don't lie on a horizontal/vertical/diagonal line.
  const buildLine = (sx: number, sy: number, ex: number, ey: number) => {
    const dx = ex - sx;
    const dy = ey - sy;
    const sel: {x: number, y: number}[] = [];
    if (dx === 0 && dy === 0) {
      sel.push({ x: sx, y: sy });
    } else if (dx === 0) {
      const step = dy > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dy); i++) sel.push({ x: sx, y: sy + i * step });
    } else if (dy === 0) {
      const step = dx > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dx); i++) sel.push({ x: sx + i * step, y: sy });
    } else if (Math.abs(dx) === Math.abs(dy)) {
      const stepX = dx > 0 ? 1 : -1;
      const stepY = dy > 0 ? 1 : -1;
      for (let i = 0; i <= Math.abs(dx); i++) sel.push({ x: sx + i * stepX, y: sy + i * stepY });
    }
    return sel;
  };

  // Resolves the selection against the current grid and marks cells found if
  // the letters spell one of the target words (in either direction).
  const commitSelection = (sel: {x: number, y: number}[]) => {
    if (sel.length < 2) return; // single-cell click can't be a word
    const selectedWord = sel.map(pos => grid[pos.y][pos.x].letter).join('');
    const reversedWord = selectedWord.split('').reverse().join('');
    const matched = displayedWords.find(w => w.placed === selectedWord || w.placed === reversedWord);
    if (matched && !foundWords.includes(matched.placed)) {
      setFoundWords(prev => {
        const newFound = [...prev, matched.placed];
        if (newFound.length === displayedWords.length) {
          setTimeout(() => setGameFinished(true), 500);
        }
        return newFound;
      });
      const newGrid = grid.map(row => row.slice());
      sel.forEach(pos => {
        newGrid[pos.y][pos.x] = { ...newGrid[pos.y][pos.x], found: true };
      });
      setGrid(newGrid);
    }
  };

  // Interaction Handlers
  const handleMouseDown = (x: number, y: number) => {
    isSelectingRef.current = true;
    selectionStartRef.current = { x, y };
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setCurrentSelection([{ x, y }]);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!isSelectingRef.current || !selectionStartRef.current) return;
    const start = selectionStartRef.current;
    const newSelection = buildLine(start.x, start.y, x, y);
    if (newSelection.length > 0) setCurrentSelection(newSelection);
  };

  // The fix: this used to read currentSelection from state, which could be
  // stale by one cell when React hadn't committed the last mouseEnter's
  // setCurrentSelection before mouseUp fired. Now we rebuild the line from
  // selectionStartRef to (x,y) at release time, guaranteeing the final cell
  // is always in the selection. (x,y) come from the cell where pointer
  // released — that's why mouseUp is attached per cell instead of the parent.
  const handleMouseUp = (x: number, y: number) => {
    if (!isSelectingRef.current) return;
    isSelectingRef.current = false;
    setIsSelecting(false);

    const start = selectionStartRef.current;
    if (start) {
      const finalSelection = buildLine(start.x, start.y, x, y);
      // Fall back to the in-progress selection only if the release cell is
      // off-line (shouldn't usually happen since handleMouseEnter rejects
      // those, but safer than commiting a 1-cell selection).
      commitSelection(finalSelection.length > 0 ? finalSelection : currentSelection);
    }
    selectionStartRef.current = null;
    setCurrentSelection([]);
    setSelectionStart(null);
  };

  // Cancel an in-progress selection without trying to match (e.g., pointer
  // left the grid). Used by the parent's mouseleave fallback.
  const cancelSelection = () => {
    if (!isSelectingRef.current) return;
    isSelectingRef.current = false;
    selectionStartRef.current = null;
    setIsSelecting(false);
    setCurrentSelection([]);
    setSelectionStart(null);
  };

  // Touch handlers — map the touch point to a cell via elementFromPoint so
  // drag-to-select works on tablets/phones. Each grid cell carries
  // data-grid-x / data-grid-y attributes the lookup keys off of.
  const cellFromTouch = (touch: Touch | React.Touch): { x: number; y: number } | null => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (!el) return null;
    const cell = el.closest('[data-grid-x]') as HTMLElement | null;
    if (!cell) return null;
    const gx = Number(cell.dataset.gridX);
    const gy = Number(cell.dataset.gridY);
    if (Number.isNaN(gx) || Number.isNaN(gy)) return null;
    return { x: gx, y: gy };
  };

  const handleTouchStart = (e: React.TouchEvent, x: number, y: number) => {
    e.preventDefault();
    handleMouseDown(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSelectingRef.current) return;
    e.preventDefault();
    const pos = cellFromTouch(e.touches[0]);
    if (pos) handleMouseEnter(pos.x, pos.y);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSelectingRef.current) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const pos = cellFromTouch(t);
    if (pos) handleMouseUp(pos.x, pos.y);
    else cancelSelection();
  };

  if (gameWon) {
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
          <h2 className="text-4xl font-extrabold text-foreground dark:text-white mb-2">¡Increíble!</h2>
          <p className="text-xl text-emerald-600 font-medium mb-6">Encontraste todas las palabras</p>
          <div className="bg-muted dark:bg-gray-900/50 p-6 rounded-2xl mb-8">
            <p className="text-sm text-muted-foreground dark:text-gray-400 uppercase tracking-widest font-bold mb-1">Puntuación</p>
            <p className="text-5xl font-black text-indigo-400">{displayedWords.length * 10}</p>
          </div>
          <Button
            onClick={() => onComplete(displayedWords.length * 10, displayedWords.length * 10)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl py-8 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Reclamar Recompensa
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!grid || grid.length === 0 || !words || words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full w-full">
        <div className="bg-card dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border-2 border-indigo-50 dark:border-indigo-900/20 max-w-md">
          <Grid3X3 className="h-12 w-12 text-indigo-400 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground dark:text-gray-400 italic">No se pudo generar la sopa de letras para este libro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start justify-center p-4 max-w-5xl mx-auto h-full">
      
      {/* Word List — shows ORIGINAL forms (with spaces/accents) of words
          that were actually placed in the grid */}
      <div className="w-full md:w-64 bg-card p-6 rounded-2xl shadow-md border border-indigo-500/50/20">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            Palabras ({foundWords.length}/{displayedWords.length})
        </h3>
        <div className="flex flex-wrap gap-2">
            {displayedWords.map(({ display, placed }) => {
                const isFound = foundWords.includes(placed);
                return (
                    <div
                        key={placed}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                            isFound
                                ? 'bg-green-100 text-green-700 line-through opacity-60'
                                : 'bg-muted text-foreground'
                        }`}
                    >
                        {display}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Grid */}
      <div
        className="bg-card p-4 rounded-2xl shadow-lg border-4 border-indigo-500/50/30 touch-none select-none"
        onMouseLeave={cancelSelection}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={cancelSelection}
      >
        <div
            className="grid gap-1"
            style={{
                gridTemplateColumns: `repeat(${grid.length}, minmax(26px, 38px))`,
                gridTemplateRows: `repeat(${grid.length}, minmax(26px, 38px))`
            }}
        >
            {grid.map((row, y) => (
                row.map((cell, x) => {
                    const isSelected = currentSelection.some(pos => pos.x === x && pos.y === y);
                    return (
                        <div
                            key={`${x}-${y}`}
                            data-grid-x={x}
                            data-grid-y={y}
                            onMouseDown={() => handleMouseDown(x, y)}
                            onMouseEnter={() => handleMouseEnter(x, y)}
                            onMouseUp={() => handleMouseUp(x, y)}
                            onTouchStart={(e) => handleTouchStart(e, x, y)}
                            className={`
                                flex items-center justify-center text-lg font-bold rounded-md cursor-pointer transition-colors duration-150
                                ${cell.found ? 'bg-green-500 text-white animate-pulse' : ''}
                                ${isSelected ? 'bg-indigo-500 text-white transform scale-110 shadow-lg z-10' : ''}
                                ${!cell.found && !isSelected ? 'bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20' : ''}
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

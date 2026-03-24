"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface VocabularyItem {
  id: string;
  word: string;
  definition: string;
  context: string;
  bookTitle: string;
  savedAt: string; // mapped from createdAt
  mastered: boolean;
}

export interface NoteItem {
  id: string;
  bookTitle: string;
  page: number;
  text: string;
  quote?: string;
  createdAt: string;
}

export interface ReadingProgress {
  bookId: string;
  lastPage: number;
  progressPercentage: number;
  lastReadAt: string;
}

export interface UserBook {
    id: string;
    userId: string;
    bookId: string;
    progress: number;
    lastRead: string;
    status?: string;
    book: {
        id: string;
        title: string;
        author: string;
        coverImage: string;
        category: string;
    }
}

interface LearningContextType {
  vocabulary: VocabularyItem[];
  notes: NoteItem[];
  readingProgress: Record<string, ReadingProgress>; // Legacy/Local
  userBooks: UserBook[]; // From API
  
  addVocabulary: (word: string, context: string, bookTitle: string, definition?: string) => Promise<void>;
  toggleVocabularyMastery: (id: string) => Promise<void>;
  
  addNote: (text: string, page: number, bookTitle: string, quote?: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  updateReadingProgress: (bookId: string, page: number, totalPages: number) => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);

  // Load from API on mount
  useEffect(() => {
    const fetchData = async () => {
        try {
            // Vocabulary
            const vocabRes = await fetch('/api/user/vocabulary');
            if (vocabRes.ok) {
                const vocabData = await vocabRes.json();
                setVocabulary(vocabData.map((v: any) => ({
                    ...v,
                    savedAt: v.createdAt
                })));
            }

            // Notes
            const notesRes = await fetch('/api/user/notes');
            if (notesRes.ok) {
                const notesData = await notesRes.json();
                setNotes(notesData);
            }

            // User Books (Readings)
            const readingsRes = await fetch('/api/user/readings');
            if (readingsRes.ok) {
                const readingsData = await readingsRes.json();
                setUserBooks(readingsData);
            }

        } catch (error) {
            console.error("Failed to fetch learning data:", error);
        }
    };

    fetchData();

    // Still load legacy reading progress from local storage
    const savedProgress = localStorage.getItem("leyopolis_reading_progress");
    if (savedProgress) setReadingProgress(JSON.parse(savedProgress));
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const readingsRes = await fetch("/api/user/readings");
        if (readingsRes.ok) {
          const readingsData = await readingsRes.json();
          setUserBooks(readingsData);
        }
      } catch {
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Save reading progress to localStorage
  useEffect(() => {
    localStorage.setItem("leyopolis_reading_progress", JSON.stringify(readingProgress));
  }, [readingProgress]);

  const addVocabulary = async (word: string, context: string, bookTitle: string, definition: string = "Definición pendiente...") => {
    // Optimistic update
    const tempId = Date.now().toString();
    const newItem: VocabularyItem = {
      id: tempId,
      word,
      context,
      bookTitle,
      definition,
      savedAt: new Date().toISOString(),
      mastered: false
    };
    setVocabulary(prev => [newItem, ...prev]);

    try {
        const res = await fetch('/api/user/vocabulary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, context, bookTitle, definition })
        });
        
        if (res.ok) {
            const savedItem = await res.json();
            setVocabulary(prev => prev.map(item => item.id === tempId ? { ...savedItem, savedAt: savedItem.createdAt } : item));
        }
    } catch (error) {
        console.error("Error saving vocabulary:", error);
    }
  };

  const toggleVocabularyMastery = async (id: string) => {
    // Optimistic
    setVocabulary(prev => prev.map(item => 
      item.id === id ? { ...item, mastered: !item.mastered } : item
    ));

    const item = vocabulary.find(v => v.id === id);
    if (!item) return;

    try {
        await fetch('/api/user/vocabulary', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, mastered: !item.mastered })
        });
    } catch (error) {
        console.error("Error updating mastery:", error);
    }
  };

  const addNote = async (text: string, page: number, bookTitle: string, quote?: string) => {
    const tempId = Date.now().toString();
    const newItem: NoteItem = {
      id: tempId,
      text,
      page,
      bookTitle,
      quote,
      createdAt: new Date().toISOString()
    };
    setNotes(prev => [newItem, ...prev]);

    try {
        const res = await fetch('/api/user/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, page, bookTitle, quote })
        });

        if (res.ok) {
            const savedItem = await res.json();
            setNotes(prev => prev.map(item => item.id === tempId ? savedItem : item));
        }
    } catch (error) {
        console.error("Error saving note:", error);
    }
  };

  const deleteNote = async (id: string) => {
    // Optimistic
    setNotes(prev => prev.filter(n => n.id !== id));

    try {
        await fetch(`/api/user/notes?id=${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Error deleting note:", error);
    }
  };

  const updateReadingProgress = (bookId: string, page: number, totalPages: number) => {
    // Local Update
    setReadingProgress(prev => ({
      ...prev,
      [bookId]: {
        bookId,
        lastPage: page,
        progressPercentage: Math.round((page / totalPages) * 100),
        lastReadAt: new Date().toISOString()
      }
    }));

    // Sync with API
    // Note: We need bookId (DB ID) for this API, but local readingProgress uses IDs that might be URLs or filenames.
    // If bookId is a UUID, we can save it.
    if (bookId.length > 10 && !bookId.includes('.')) { // Simple heuristic check for UUID vs filename
        fetch('/api/user/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookId,
                progress: Math.round((page / totalPages) * 100)
            })
        }).catch(err => console.error("Failed to sync reading progress", err));
    }
  };

  return (
    <LearningContext.Provider value={{
      vocabulary,
      notes,
      readingProgress,
      userBooks,
      addVocabulary,
      toggleVocabularyMastery,
      addNote,
      deleteNote,
      updateReadingProgress
    }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (context === undefined) {
    throw new Error("useLearning must be used within a LearningProvider");
  }
  return context;
}


"use client";

import React, { useState, useEffect } from 'react';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, Calendar, CheckCircle2 } from 'lucide-react';
import { DISPLAY_GRADES, GRADE_TO_STANDARD } from "@/lib/grades";
import { cn } from "@/lib/utils";

interface Book {
    id: string;
    title: string;
    author: string;
    coverImage: string;
    grade: string | null;
}

interface ClassOption {
    id: string;
    name: string;
}

interface SuggestedReadingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: ClassOption[];
}

export function SuggestedReadingsDialog({ isOpen, onClose, onSuccess, classes }: SuggestedReadingsDialogProps) {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGrade, setSelectedGrade] = useState("Todos");
    
    // Assignment form state
    const [assigningTo, setAssigningTo] = useState<Book | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [dueDate, setDueDate] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSuggestedBooks();
        }
    }, [isOpen, selectedGrade]);

    const fetchSuggestedBooks = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedGrade !== "Todos") {
                params.set("grade", GRADE_TO_STANDARD[selectedGrade] || selectedGrade);
            }
            const res = await fetch(`/api/books?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBooks(data);
            }
        } catch (error) {
            console.error("Failed to fetch suggested books", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!assigningTo || !selectedClass || !dueDate) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/teacher/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClass,
                    bookId: assigningTo.id,
                    title: `Lectura sugerida: ${assigningTo.title}`,
                    description: "Lectura asignada desde el panel de sugerencias inteligentes.",
                    dueDate: new Date(dueDate).toISOString()
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setAssigningTo(null);
                    onSuccess();
                }, 2000);
            }
        } catch (error) {
            console.error("Failed to assign reading", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="h-6 w-6 text-indigo-500" />
                        Lecturas Sugeridas por Curso
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona un grado para ver lecturas recomendadas y asígnalas directamente a tus estudiantes.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-2 border-b bg-muted flex items-center gap-4">
                    <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unidad / Curso:</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-[180px] bg-card">
                            <SelectValue placeholder="Selecciona grado" />
                        </SelectTrigger>
                        <SelectContent>
                            {DISPLAY_GRADES.map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                            <p className="text-muted-foreground italic">Buscando las mejores opciones...</p>
                        </div>
                    ) : books.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {books.map((book) => (
                                <Card key={book.id} className="group relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all">
                                    <div className="aspect-[3/4] overflow-hidden bg-muted">
                                        <img 
                                            src={book.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(book.title)}`} 
                                            alt={book.title}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                                            <Button 
                                                variant="secondary" 
                                                className="w-full bg-card text-indigo-200 border-none hover:bg-indigo-500/10 font-bold"
                                                onClick={() => {
                                                    setAssigningTo(book);
                                                    setSuccess(false);
                                                }}
                                            >
                                                Asignar Lectura
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-3">
                                        <h4 className="font-bold text-foreground line-clamp-1">{book.title}</h4>
                                        <p className="text-xs text-muted-foreground mb-2">{book.author}</p>
                                        {book.grade && (
                                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                                                {book.grade}
                                            </span>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-muted-foreground">No se encontraron lecturas sugeridas para este curso por el momento.</p>
                        </div>
                    )}
                </div>

                {/* Assignment Overlay Mini-Form */}
                {assigningTo && (
                    <div className={cn(
                        "absolute inset-0 z-50 bg-card/95 backdrop-blur-sm flex items-center justify-center p-8 transition-all animate-in fade-in zoom-in-95",
                        success && "bg-green-50/95"
                    )}>
                        {success ? (
                            <div className="text-center space-y-4 animate-bounce">
                                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                                <h3 className="text-2xl font-bold text-green-900">¡Lectura Asignada!</h3>
                                <p className="text-green-700">Tus estudiantes ya pueden ver esta nueva unidad.</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-md space-y-6">
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-foreground line-clamp-2">Asignar "{assigningTo.title}"</h3>
                                    <p className="text-sm text-muted-foreground">Configura los detalles de la asignación para tus alumnos.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Clase o Grupo</Label>
                                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                                            <SelectTrigger><SelectValue placeholder="Elije una clase..." /></SelectTrigger>
                                            <SelectContent>
                                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fecha Límite</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input 
                                                type="date" 
                                                className="pl-10" 
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="ghost" className="flex-1" onClick={() => setAssigningTo(null)}>Cancelar</Button>
                                    <Button 
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                        disabled={!selectedClass || !dueDate || submitting}
                                        onClick={handleAssign}
                                    >
                                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirmar Asignación
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="p-4 border-t bg-muted flex justify-end">
                  <Button variant="outline" onClick={onClose}>Cerrar Panel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

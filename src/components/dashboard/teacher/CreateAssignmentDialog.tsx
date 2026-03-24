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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ClassOption {
    id: string;
    name: string;
}

interface BookOption {
    id: string;
    title: string;
}

interface CreateAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: ClassOption[];
}

export function CreateAssignmentDialog({ isOpen, onClose, onSuccess, classes }: CreateAssignmentDialogProps) {
    const [books, setBooks] = useState<BookOption[]>([]);
    const [loadingBooks, setLoadingBooks] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [selectedBook, setSelectedBook] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<Date>();

    // Fetch books on mount
    useEffect(() => {
        const fetchBooks = async () => {
            setLoadingBooks(true);
            try {
                const res = await fetch('/api/books');
                if (res.ok) {
                    const data = await res.json();
                    setBooks(data);
                }
            } catch (error) {
                console.error("Failed to fetch books", error);
            } finally {
                setLoadingBooks(false);
            }
        };

        if (isOpen) {
            fetchBooks();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedBook || !title || !dueDate) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/teacher/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: selectedClass,
                    bookId: selectedBook,
                    title,
                    description,
                    dueDate: dueDate.toISOString()
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
                // Reset form
                setTitle("");
                setDescription("");
                setSelectedClass("");
                setSelectedBook("");
                setDueDate(undefined);
            }
        } catch (error) {
            console.error("Failed to create assignment", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Asignación</DialogTitle>
                    <DialogDescription>
                        Asigna una lectura a una clase con fecha límite.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    
                    {/* Class Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="class">Clase</Label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una clase" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Book Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="book">Libro</Label>
                        <Select value={selectedBook} onValueChange={setSelectedBook}>
                            <SelectTrigger>
                                <SelectValue placeholder={loadingBooks ? "Cargando libros..." : "Selecciona un libro"} />
                            </SelectTrigger>
                            <SelectContent>
                                {books.map((book) => (
                                    <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título de la Tarea</Label>
                        <Input 
                            id="title" 
                            placeholder="Ej: Leer Capítulo 1-3" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Fecha de Entrega</Label>
                        <Input 
                            id="dueDate"
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={dueDate ? dueDate.toISOString().split('T')[0] : ""}
                            onChange={(e) => {
                                const date = e.target.valueAsDate;
                                if (date) setDueDate(date);
                            }}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Instrucciones (Opcional)</Label>
                        <Textarea 
                            id="description" 
                            placeholder="Instrucciones adicionales para los estudiantes..." 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={submitting || !selectedClass || !selectedBook || !title || !dueDate}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Asignación
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import React, { useState } from 'react';
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
import { Loader2, Upload } from 'lucide-react';

interface UploadBookDialogProps {
    onSuccess: () => void;
}

export function UploadBookDialog({ onSuccess }: UploadBookDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: 'Literatura',
        difficulty: 'Intermedio',
        coverImage: '',
        contentUrl: '' // For now, we'll just paste a URL or use a placeholder
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    // Use placeholders if empty for prototype
                    coverImage: formData.coverImage || `https://placehold.co/400x600?text=${encodeURIComponent(formData.title)}`,
                    contentUrl: formData.contentUrl || '/books/sample.pdf' 
                })
            });

            if (res.ok) {
                setIsOpen(false);
                setFormData({
                    title: '',
                    author: '',
                    category: 'Literatura',
                    difficulty: 'Intermedio',
                    coverImage: '',
                    contentUrl: ''
                });
                onSuccess();
            }
        } catch (error) {
            console.error("Failed to upload book", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Upload className="h-4 w-4" /> Subir Libro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Subir Nuevo Libro</DialogTitle>
                    <DialogDescription>
                        Añade un libro a la biblioteca digital.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input 
                            id="title" 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="author">Autor</Label>
                        <Input 
                            id="author" 
                            value={formData.author}
                            onChange={(e) => setFormData({...formData, author: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select 
                                value={formData.category} 
                                onValueChange={(val) => setFormData({...formData, category: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Literatura">Literatura</SelectItem>
                                    <SelectItem value="Ciencia">Ciencia</SelectItem>
                                    <SelectItem value="Historia">Historia</SelectItem>
                                    <SelectItem value="Académico">Académico</SelectItem>
                                    <SelectItem value="Infantil">Infantil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Dificultad</Label>
                            <Select 
                                value={formData.difficulty} 
                                onValueChange={(val) => setFormData({...formData, difficulty: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Principiante">Principiante</SelectItem>
                                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cover">URL de Portada (Opcional)</Label>
                        <Input 
                            id="cover" 
                            placeholder="https://..."
                            value={formData.coverImage}
                            onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pdf">URL del PDF (Opcional)</Label>
                        <Input 
                            id="pdf" 
                            placeholder="/books/archivo.pdf"
                            value={formData.contentUrl}
                            onChange={(e) => setFormData({...formData, contentUrl: e.target.value})}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={submitting || !formData.title || !formData.author}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Subir
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

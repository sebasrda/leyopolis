"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, CheckCircle2, PlayCircle, Clock } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    description: string;
    status: 'PENDING' | 'COMPLETED';
    progress: number;
    book: {
        id: string;
        title: string;
        author: string;
        coverImage: string;
    };
    class: {
        name: string;
    };
}

export function MyAssignments() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const res = await fetch('/api/user/assignments');
                if (res.ok) {
                    const data = await res.json();
                    setAssignments(data);
                }
            } catch (error) {
                console.error("Failed to fetch assignments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    if (loading) {
        return (
            <Card className="border-none shadow-sm h-full">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-600" /> Tareas Pendientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 animate-pulse">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (assignments.length === 0) {
        return (
            <Card className="border-none shadow-sm h-full">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-600" /> Tareas Pendientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-green-500 opacity-20" />
                    <p>¡Todo al día! No tienes tareas pendientes.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm h-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" /> Tareas Pendientes
                </CardTitle>
                <CardDescription>Lecturas asignadas por tus profesores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {assignments.map((assignment) => {
                    const isOverdue = new Date(assignment.dueDate) < new Date() && assignment.status !== 'COMPLETED';
                    const daysLeft = Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                        <div key={assignment.id} className="group flex items-start gap-4 p-4 rounded-xl border bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                            <div className="relative w-16 h-24 shrink-0 rounded-md overflow-hidden shadow-sm">
                                <img 
                                    src={assignment.book.coverImage || "https://placehold.co/400x600?text=Libro"} 
                                    alt={assignment.book.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {assignment.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <span className="font-medium text-indigo-500">{assignment.class.name}</span>
                                            <span>•</span>
                                            <span>{assignment.book.title}</span>
                                        </p>
                                    </div>
                                    <Badge variant={assignment.status === 'COMPLETED' ? "outline" : "secondary"} className={cn(
                                        assignment.status === 'COMPLETED' ? "border-green-500 text-green-600 bg-green-50" : "bg-indigo-50 text-indigo-700"
                                    )}>
                                        {assignment.status === 'COMPLETED' ? 'Completado' : `${assignment.progress}%`}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                    <div className={cn(
                                        "flex items-center gap-1 font-medium",
                                        isOverdue ? "text-red-500" : daysLeft <= 3 ? "text-orange-500" : "text-gray-500"
                                    )}>
                                        <Calendar className="h-3 w-3" />
                                        {isOverdue ? 'Vencida' : `${daysLeft} días restantes`}
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <Clock className="h-3 w-3" />
                                        {new Date(assignment.dueDate).toLocaleDateString()}
                                    </div>
                                </div>

                                {assignment.status !== 'COMPLETED' && (
                                    <div className="pt-1">
                                        <Progress value={assignment.progress} className="h-1.5" />
                                    </div>
                                )}
                                
                                <div className="pt-1">
                                    <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 h-8 text-xs font-bold">
                                        <Link href={`/dashboard/reader/${assignment.book.id}?title=${encodeURIComponent(assignment.book.title)}&assignmentId=${assignment.id}`}>
                                            {assignment.progress > 0 ? "Continuar" : "Empezar"} <PlayCircle className="ml-1.5 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

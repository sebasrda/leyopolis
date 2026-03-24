"use client";

import React, { useEffect, useState } from 'react';
import { 
    Users, 
    BookOpen, 
    ArrowLeft, 
    MoreVertical, 
    Calendar, 
    BarChart3,
    Search,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';

interface Student {
    id: string;
    name: string;
    email: string;
    image: string;
    avgProgress: number;
    assignmentsCompleted: number;
    lastActive: string;
}

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    book: {
        title: string;
        coverImage: string;
    };
}

interface ClassData {
    id: string;
    name: string;
    students: Student[];
    assignments: Assignment[];
}

export default function ClassDetail({ classId }: { classId: string }) {
    const [classData, setClassData] = useState<ClassData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchClassData = async () => {
            try {
                const res = await fetch(`/api/teacher/classes/${classId}`);
                if (res.ok) {
                    const data = await res.json();
                    setClassData(data);
                }
            } catch (error) {
                console.error("Failed to fetch class details", error);
            } finally {
                setLoading(false);
            }
        };

        if (classId) {
            fetchClassData();
        }
    }, [classId]);

    if (loading) {
        return <div className="p-8 text-center">Cargando detalles de la clase...</div>;
    }

    if (!classData) {
        return <div className="p-8 text-center text-red-500">Clase no encontrada</div>;
    }

    const filteredStudents = classData.students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link href="/dashboard/teacher" className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 w-fit">
                    <ArrowLeft size={16} /> Volver al Panel
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
                        <p className="text-gray-500">Detalles del grupo y progreso de estudiantes.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            <BarChart3 size={18} />
                            Exportar Reporte
                        </Button>
                        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <BookOpen size={18} />
                            Nueva Asignación
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Estudiantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{classData.students.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Asignaciones Activas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{classData.assignments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Progreso Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {classData.students.length > 0 
                                ? Math.round(classData.students.reduce((acc, s) => acc + s.avgProgress, 0) / classData.students.length) 
                                : 0}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Asignaciones Recientes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classData.assignments.map((assignment) => (
                        <Card key={assignment.id} className="flex flex-row overflow-hidden h-24">
                            <div className="w-16 bg-gray-100 shrink-0">
                                <img src={assignment.book.coverImage || "https://placehold.co/400x600?text=Libro"} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 flex flex-col justify-center flex-1">
                                <h3 className="font-bold text-sm line-clamp-1">{assignment.title}</h3>
                                <p className="text-xs text-gray-500 mb-1">{assignment.book.title}</p>
                                <div className="flex items-center gap-1 text-xs text-indigo-600 mt-auto">
                                    <Calendar size={12} />
                                    {new Date(assignment.dueDate).toLocaleDateString()}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {classData.assignments.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">
                            No hay asignaciones activas
                        </div>
                    )}
                </div>
            </div>

            {/* Students Table */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Estudiantes</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Buscar estudiante..." 
                            className="pl-8" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estudiante</TableHead>
                                <TableHead>Progreso General</TableHead>
                                <TableHead>Tareas Completadas</TableHead>
                                <TableHead>Última Actividad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={student.image} />
                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-bold">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={student.avgProgress} className="w-20 h-2" />
                                            <span className="text-xs font-medium">{student.avgProgress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-green-50 text-green-700">
                                            {student.assignmentsCompleted} completadas
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {new Date(student.lastActive).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Ver Detalles</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredStudents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No se encontraron estudiantes
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}

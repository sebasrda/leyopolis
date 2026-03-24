
"use client";

import React, { useState } from 'react';
import { 
    Users, 
    BookOpen, 
    Plus, 
    MoreVertical, 
    Calendar, 
    BarChart3,
    Search,
    Sparkles,
    PlayCircle,
    GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreateAssignmentDialog } from './CreateAssignmentDialog';

import Link from 'next/link';

interface ClassGroup {
    id: string;
    name: string;
    students: number;
    activeAssignment: string;
    progress: number;
    nextDeadline: string | null;
}

export default function TeacherDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [eduOverview, setEduOverview] = useState<{
        counts: { courses: number; activities: number; videos: number; attempts7d: number };
        latestAttempts: { id: string; score: number; createdAt: string; activity: { id: string; title: string }; user: { id: string; name: string | null; email: string | null } }[];
    } | null>(null);

    // Fetch classes on mount
    React.useEffect(() => {
        fetchClasses();
        fetchEduOverview();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/teacher/classes');
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (error) {
            console.error("Failed to fetch classes", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEduOverview = async () => {
        try {
            const res = await fetch('/api/teacher/education/overview');
            if (res.ok) {
                const data = await res.json();
                setEduOverview(data);
            }
        } catch {
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        
        try {
            const res = await fetch('/api/teacher/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClassName })
            });
            
            if (res.ok) {
                setNewClassName('');
                setIsCreating(false);
                fetchClasses(); // Refresh list
            }
        } catch (error) {
            console.error("Failed to create class", error);
        }
    };

    const filteredClasses = classes.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Profesor</h1>
                    <p className="text-gray-500">Gestiona tus aulas y asignaciones de lectura.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2">
                        <BarChart3 size={18} />
                        Reporte General
                    </Button>
                    <Button 
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => setIsAssignmentDialogOpen(true)}
                    >
                        <BookOpen size={18} />
                        Asignar Lectura
                    </Button>
                </div>
            </div>

            <CreateAssignmentDialog 
                isOpen={isAssignmentDialogOpen}
                onClose={() => setIsAssignmentDialogOpen(false)}
                onSuccess={fetchClasses}
                classes={classes}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Estudiantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">72</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            +4 nuevos esta semana
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Lecturas Activas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-gray-500 mt-1">
                            3 asignaciones finalizan pronto
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Comprensión Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">78%</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            +2% vs mes anterior
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Cursos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{eduOverview?.counts.courses ?? 0}</div>
                            <GraduationCap className="h-5 w-5 text-indigo-600" />
                        </div>
                        <Link href="/dashboard/courses">
                            <Button variant="outline" className="w-full mt-4">Gestionar cursos</Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Actividades</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{eduOverview?.counts.activities ?? 0}</div>
                            <Sparkles className="h-5 w-5 text-purple-600" />
                        </div>
                        <Link href="/dashboard/activities">
                            <Button variant="outline" className="w-full mt-4">Crear actividades</Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Videos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">{eduOverview?.counts.videos ?? 0}</div>
                            <PlayCircle className="h-5 w-5 text-emerald-600" />
                        </div>
                        <Link href="/dashboard/videos">
                            <Button variant="outline" className="w-full mt-4">Subir enlaces</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">Resultados recientes de actividades</CardTitle>
                    <CardDescription>Intentos completados por estudiantes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {eduOverview?.latestAttempts?.length ? (
                        eduOverview.latestAttempts.slice(0, 8).map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                                <div className="space-y-1">
                                    <div className="font-semibold text-gray-900 line-clamp-1">{a.activity.title}</div>
                                    <div className="text-xs text-gray-500">
                                        {a.user.name || a.user.email || "Estudiante"} · {new Date(a.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                                    {Math.round(a.score)}
                                </Badge>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-gray-500">Sin intentos recientes.</div>
                    )}
                </CardContent>
            </Card>

            {/* Classes Grid */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">Mis Clases</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Buscar clase..." 
                            className="pl-8" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map((cls) => (
                        <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-indigo-500">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="mb-2 bg-indigo-50 text-indigo-700">
                                        {cls.students} Estudiantes
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                        <MoreVertical size={16} />
                                    </Button>
                                </div>
                                <CardTitle className="text-lg">{cls.name}</CardTitle>
                                <CardDescription className="line-clamp-1">
                                    Tarea actual: {cls.activeAssignment}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-500">Progreso del grupo</span>
                                            <span className="font-semibold text-indigo-600">{cls.progress}%</span>
                                        </div>
                                        <Progress value={cls.progress} className="h-2" />
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                                        <div className="flex items-center text-gray-500">
                                            <Calendar size={14} className="mr-1" />
                                            {cls.nextDeadline ? new Date(cls.nextDeadline).toLocaleDateString() : 'Sin fecha'}
                                        </div>
                                        <Link href={`/dashboard/teacher/class/${cls.id}`}>
                                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 p-0 h-auto">
                                                Gestionar &rarr;
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    
                    {/* Add Class Card */}
                    {isCreating ? (
                        <Card className="flex flex-col justify-center p-6 border-2 border-indigo-400 bg-indigo-50/50 h-full min-h-[200px]">
                            <h3 className="font-semibold text-gray-700 mb-4">Nueva Clase</h3>
                            <Input 
                                placeholder="Nombre de la clase" 
                                className="mb-4 bg-white"
                                value={newClassName}
                                onChange={(e) => setNewClassName(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleCreateClass} className="bg-indigo-600 hover:bg-indigo-700 flex-1">Crear</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">Cancelar</Button>
                            </div>
                        </Card>
                    ) : (
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group h-full min-h-[200px]"
                        >
                            <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Plus size={24} />
                            </div>
                            <h3 className="font-semibold text-gray-700">Crear Nueva Clase</h3>
                            <p className="text-sm text-gray-500 text-center mt-1">Añade un nuevo grupo de estudiantes</p>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

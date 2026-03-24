"use client";

import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Users, 
    MessageSquare, 
    Send, 
    MoreVertical, 
    Image as ImageIcon,
    Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Post {
    id: string;
    content: string;
    createdAt: string;
    commentsCount: number;
    author: {
        id: string;
        name: string;
        image: string | null;
    };
}

interface ClubData {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    membersCount: number;
    isMember: boolean;
    posts: Post[];
}

export default function ClubDetailView({ clubId }: { clubId: string }) {
    const [club, setClub] = useState<ClubData | null>(null);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        fetchClubData();
    }, [clubId]);

    const fetchClubData = async () => {
        try {
            const res = await fetch(`/api/community/clubs/${clubId}`);
            if (res.ok) {
                const data = await res.json();
                setClub(data);
            }
        } catch (error) {
            console.error("Failed to fetch club details", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostSubmit = async () => {
        if (!newPostContent.trim()) return;
        setPosting(true);

        try {
            const res = await fetch(`/api/community/clubs/${clubId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newPostContent })
            });

            if (res.ok) {
                const newPost = await res.json();
                setClub(prev => prev ? {
                    ...prev,
                    posts: [newPost, ...prev.posts]
                } : null);
                setNewPostContent('');
            }
        } catch (error) {
            console.error("Failed to create post", error);
        } finally {
            setPosting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Cargando club...</div>;
    }

    if (!club) {
        return <div className="p-8 text-center text-red-500">Club no encontrado</div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            {/* Header Image */}
            <div className="h-48 md:h-64 w-full relative bg-gray-200">
                <img 
                    src={club.coverImage || "https://placehold.co/800x300?text=Club"} 
                    alt={club.name} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-white">
                    <Link href="/dashboard/community" className="text-white/80 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium w-fit">
                        <ArrowLeft size={16} /> Volver a Clubes
                    </Link>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">{club.name}</h1>
                            <p className="text-white/90 max-w-2xl text-sm md:text-base">{club.description}</p>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                                <Users size={18} />
                                <span className="font-bold">{club.membersCount}</span> Miembros
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Create Post */}
                    {club.isMember ? (
                        <Card className="shadow-sm border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    <Avatar>
                                        <AvatarFallback>YO</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-3">
                                        <Textarea 
                                            placeholder="Comparte tus pensamientos sobre la lectura actual..." 
                                            className="resize-none min-h-[80px] border-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-indigo-200 transition-all"
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                        />
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                            <div className="flex gap-2 text-gray-400">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-600">
                                                    <ImageIcon size={18} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-600">
                                                    <Smile size={18} />
                                                </Button>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                                                onClick={handlePostSubmit}
                                                disabled={posting || !newPostContent.trim()}
                                            >
                                                <Send size={14} /> Publicar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-center text-indigo-800">
                            Únete al club para participar en la conversación.
                        </div>
                    )}

                    {/* Posts List */}
                    <div className="space-y-4">
                        {club.posts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Aún no hay publicaciones. ¡Sé el primero!</p>
                            </div>
                        ) : (
                            club.posts.map((post) => (
                                <Card key={post.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={post.author.image || undefined} />
                                                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-sm">{post.author.name}</h4>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </div>
                                        
                                        <p className="text-gray-800 mb-4 whitespace-pre-wrap text-sm leading-relaxed">
                                            {post.content}
                                        </p>

                                        <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-indigo-600 gap-2 h-8">
                                                <MessageSquare size={16} />
                                                <span className="text-xs">{post.commentsCount} Comentarios</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-5">
                            <h3 className="font-bold text-gray-900 mb-4">Sobre el Club</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Miembros</span>
                                    <span className="font-medium">{club.membersCount}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-gray-500">Publicaciones</span>
                                    <span className="font-medium">{club.posts.length}</span>
                                </div>
                                <div className="pt-2">
                                    <h4 className="font-medium mb-2 text-gray-700">Lectura Actual</h4>
                                    <div className="bg-gray-50 p-3 rounded-lg flex gap-3 items-center">
                                        <div className="w-10 h-14 bg-gray-200 rounded shrink-0 overflow-hidden">
                                             {/* Placeholder book cover */}
                                             <img src="https://placehold.co/100x140?text=Libro" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs line-clamp-1">Libro del Mes</p>
                                            <p className="text-xs text-gray-500">Autor Desconocido</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

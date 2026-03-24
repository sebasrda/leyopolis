"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Users, MessageSquare } from "lucide-react";

import Link from 'next/link';

interface Club {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    membersCount: number;
    postsCount: number;
    isMember: boolean;
}

export function CommunityClubs() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        try {
            const res = await fetch('/api/community/clubs');
            if (res.ok) {
                const data = await res.json();
                setClubs(data);
            }
        } catch (error) {
            console.error("Failed to fetch clubs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinLeave = async (clubId: string, isMember: boolean) => {
        if (processing) return;
        setProcessing(clubId);
        try {
            const res = await fetch('/api/community/clubs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    clubId, 
                    action: isMember ? 'leave' : 'join' 
                })
            });

            if (res.ok) {
                // Optimistic update
                setClubs(clubs.map(c => {
                    if (c.id === clubId) {
                        return {
                            ...c,
                            isMember: !isMember,
                            membersCount: isMember ? c.membersCount - 1 : c.membersCount + 1
                        };
                    }
                    return c;
                }));
            }
        } catch (error) {
            console.error("Failed to update membership", error);
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Cargando clubes...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
                <Card key={club.id} className="group overflow-hidden hover:shadow-lg transition-all border-t-4 border-t-indigo-500">
                    <div className="h-32 bg-gray-100 relative cursor-pointer">
                        <Link href={`/dashboard/community/club/${club.id}`}>
                        <img 
                            src={club.coverImage || "https://placehold.co/400x200?text=Club"} 
                            alt={club.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40" />
                        <div className="absolute bottom-3 left-4 text-white z-10">
                            <h3 className="font-bold text-lg drop-shadow-md">{club.name}</h3>
                        </div>
                        </Link>
                    </div>
                    <CardContent className="p-4 pt-4">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                            {club.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {club.membersCount} miembros
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {club.postsCount} publicaciones
                            </div>
                        </div>

                        <Button 
                            className={`w-full ${club.isMember 
                                ? "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50" 
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                            onClick={() => handleJoinLeave(club.id, club.isMember)}
                            disabled={processing === club.id}
                        >
                            {processing === club.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : club.isMember ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" /> Miembro
                                </>
                            ) : (
                                "Unirse al Club"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

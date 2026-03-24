
"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  MessageSquare, 
  Search, 
  Plus, 
  LogIn,
  LogOut,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Club {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  membersCount: number;
  postsCount: number;
  isMember: boolean;
}

export default function CommunityPage() {
  const { data: session } = useSession();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchClubs = async () => {
    try {
      const res = await fetch("/api/community/clubs");
      if (res.ok) {
        const data = await res.json();
        setClubs(data);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleJoinToggle = async (clubId: string, isMember: boolean) => {
    try {
      const res = await fetch("/api/community/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clubId, 
          action: isMember ? "leave" : "join" 
        })
      });

      if (res.ok) {
        // Optimistic update
        setClubs(prev => prev.map(club => {
          if (club.id === clubId) {
            return {
              ...club,
              isMember: !isMember,
              membersCount: isMember ? club.membersCount - 1 : club.membersCount + 1
            };
          }
          return club;
        }));
      }
    } catch (error) {
      console.error("Error updating membership:", error);
    }
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Comunidad y Clubes</h1>
          <p className="text-gray-500">Únete a grupos de lectura y comparte tus ideas.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-indigo-600 hover:bg-indigo-500 gap-2">
            <Plus className="h-4 w-4" /> Crear Club
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Buscar clubes de lectura..." 
          className="pl-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-64 bg-gray-100 border-none" />
          ))}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No se encontraron clubes</h3>
          <p className="text-gray-500">Intenta con otra búsqueda o crea tu propio club.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <Card key={club.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-none shadow-sm flex flex-col h-full">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <img 
                  src={club.coverImage || "https://placehold.co/400x200?text=Club"} 
                  alt={club.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-4 left-4 z-20 text-white">
                  <h3 className="font-bold text-xl drop-shadow-md">{club.name}</h3>
                  <div className="flex items-center gap-4 text-xs mt-1 font-medium opacity-90">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {club.membersCount} miembros
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {club.postsCount} posts
                    </span>
                  </div>
                </div>
                {club.isMember && (
                  <Badge className="absolute top-4 right-4 z-20 bg-green-500 hover:bg-green-600 shadow-md">
                    Miembro
                  </Badge>
                )}
              </div>
              
              <CardContent className="flex-1 p-5">
                <p className="text-gray-600 text-sm line-clamp-3">{club.description}</p>
              </CardContent>
              
              <CardFooter className="p-5 pt-0 gap-3 border-t bg-gray-50/50 mt-auto pt-4">
                <Link href={`/dashboard/community/club/${club.id}`} className="flex-1">
                  <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    <BookOpen className="h-4 w-4 mr-2" /> Entrar
                  </Button>
                </Link>
                <Button 
                  variant={club.isMember ? "outline" : "secondary"}
                  size="icon"
                  onClick={() => handleJoinToggle(club.id, club.isMember)}
                  title={club.isMember ? "Salir del club" : "Unirse al club"}
                  className={club.isMember ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"}
                >
                  {club.isMember ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

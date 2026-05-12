"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Send,
  Heart,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  isMine: boolean;
}
interface Post {
  id: string;
  content: string;
  createdAt: string;
  commentsCount: number;
  likesCount: number;
  liked: boolean;
  isMine: boolean;
  author: Author;
}
interface ClubData {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  membersCount: number;
  isMember: boolean;
  myRole: string | null;
  posts: Post[];
}

export default function ClubDetailView({ clubId }: { clubId: string }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isMod = ["TEACHER", "COORDINATOR", "ADMIN", "SUPERADMIN"].includes(role || "");

  const [club, setClub] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  // Per-post: which comment threads are open + cached comments
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [draftByPost, setDraftByPost] = useState<Record<string, string>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);

  const fetchClubData = async () => {
    try {
      const res = await fetch(`/api/community/clubs/${clubId}`, { cache: "no-store" });
      if (res.ok) setClub(await res.json());
    } catch (e) {
      console.error("Failed to fetch club details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, [clubId]);

  const toggleMembership = async () => {
    if (!club) return;
    const action = club.isMember ? "leave" : "join";
    // optimistic
    setClub({ ...club, isMember: !club.isMember, membersCount: club.isMember ? club.membersCount - 1 : club.membersCount + 1 });
    await fetch("/api/community/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, action }),
    });
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim() || !club) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/community/clubs/${clubId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent.trim() }),
      });
      if (res.ok) {
        const newPost: Post = await res.json();
        setClub((prev) => prev ? { ...prev, posts: [newPost, ...prev.posts] } : null);
        setNewPostContent("");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!club) return;
    // optimistic
    setClub({
      ...club,
      posts: club.posts.map((p) =>
        p.id === postId
          ? { ...p, liked: !currentlyLiked, likesCount: currentlyLiked ? p.likesCount - 1 : p.likesCount + 1 }
          : p,
      ),
    });
    try {
      const res = await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // reconcile counter with server truth
        setClub((prev) => prev ? {
          ...prev,
          posts: prev.posts.map((p) => p.id === postId ? { ...p, liked: data.liked, likesCount: data.likesCount } : p),
        } : null);
      }
    } catch {
      // revert on fail
      fetchClubData();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
    const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    if (res.ok && club) {
      setClub({ ...club, posts: club.posts.filter((p) => p.id !== postId) });
    }
  };

  const toggleComments = async (postId: string) => {
    const willOpen = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: willOpen }));
    if (willOpen && !commentsByPost[postId]) {
      setLoadingCommentsFor(postId);
      try {
        const res = await fetch(`/api/community/posts/${postId}/comments`, { cache: "no-store" });
        if (res.ok) {
          const data: Comment[] = await res.json();
          setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
        }
      } finally {
        setLoadingCommentsFor(null);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const draft = (draftByPost[postId] || "").trim();
    if (!draft) return;
    const res = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    if (res.ok) {
      const newC: Comment = await res.json();
      setCommentsByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newC] }));
      setDraftByPost((prev) => ({ ...prev, [postId]: "" }));
      // bump comment count on the post
      setClub((prev) => prev ? {
        ...prev,
        posts: prev.posts.map((p) => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p),
      } : null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!club) {
    return <div className="p-8 text-center text-red-500">Club no encontrado</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* ── Header ─────────────────────────── */}
      <div className="h-48 md:h-64 w-full relative bg-gray-200 rounded-b-3xl overflow-hidden">
        <img
          src={club.coverImage || "https://placehold.co/800x300?text=Club"}
          alt={club.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-white">
          <Link href="/dashboard/community" className="text-white/80 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium w-fit">
            <ArrowLeft size={16} /> Volver a Clubes
          </Link>
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{club.name}</h1>
              <p className="text-white/90 max-w-2xl text-sm md:text-base">{club.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full text-sm">
                <Users size={18} />
                <span className="font-bold">{club.membersCount}</span> Miembros
              </div>
              <Button
                onClick={toggleMembership}
                size="sm"
                className={club.isMember ? "bg-red-500/30 hover:bg-red-500/40 backdrop-blur-md border border-red-300/30" : "bg-indigo-600 hover:bg-indigo-700"}
              >
                {club.isMember ? "Salir" : "Unirse al club"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post */}
          {club.isMember ? (
            <Card className="shadow-sm border-border">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={(session?.user?.image as string) || undefined} />
                    <AvatarFallback>{session?.user?.name?.[0]?.toUpperCase() || "YO"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Comparte tus pensamientos sobre la lectura actual…"
                      className="resize-none min-h-[80px] border-none bg-muted focus:bg-card focus:ring-1 focus:ring-indigo-500/30 transition-all"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-[10px] text-muted-foreground">{newPostContent.length}/2000</span>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                        onClick={handlePostSubmit}
                        disabled={posting || !newPostContent.trim()}
                      >
                        {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={14} />}
                        {posting ? "Publicando…" : "Publicar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-center text-indigo-300">
              Únete al club para participar en la conversación.
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {club.posts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Aún no hay publicaciones. ¡Sé el primero!</p>
              </div>
            ) : (
              club.posts.map((post) => {
                const open = !!openComments[post.id];
                const comments = commentsByPost[post.id];
                return (
                  <Card key={post.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={post.author.image || undefined} />
                            <AvatarFallback>{post.author.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{post.author.name || "Anónimo"}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        </div>
                        {(post.isMine || isMod) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDeletePost(post.id)}
                            title="Eliminar publicación"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>

                      <p className="text-foreground mb-4 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

                      <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id, post.liked)}
                          disabled={!club.isMember}
                          className={`gap-2 h-8 transition-colors ${
                            post.liked ? "text-pink-400 hover:text-pink-300" : "text-muted-foreground hover:text-pink-400"
                          }`}
                          title={post.liked ? "Quitar like" : "Me gusta"}
                        >
                          <Heart size={16} className={post.liked ? "fill-current" : ""} />
                          <span className="text-xs">{post.likesCount}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleComments(post.id)}
                          className="text-muted-foreground hover:text-indigo-400 gap-2 h-8"
                        >
                          <MessageSquare size={16} />
                          <span className="text-xs">{post.commentsCount}</span>
                        </Button>
                      </div>

                      {/* Comments thread */}
                      {open && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {loadingCommentsFor === post.id && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" /> Cargando comentarios…
                            </div>
                          )}
                          {comments && comments.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Aún no hay comentarios.</p>
                          )}
                          {comments && comments.map((c) => (
                            <div key={c.id} className="flex gap-2 text-sm">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={c.author.image || undefined} />
                                <AvatarFallback className="text-[10px]">{c.author.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-muted/30 rounded-lg p-2.5">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-xs text-foreground">{c.author.name || "Anónimo"}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          {club.isMember && (
                            <div className="flex gap-2 pt-2">
                              <Input
                                value={draftByPost[post.id] || ""}
                                onChange={(e) => setDraftByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id);
                                  }
                                }}
                                placeholder="Escribe un comentario…"
                                className="text-sm h-9"
                                maxLength={1000}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(post.id)}
                                disabled={!(draftByPost[post.id] || "").trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 h-9"
                              >
                                <Send size={14} />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> Sobre el club
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Miembros</span>
                  <span className="font-bold text-foreground">{club.membersCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Publicaciones</span>
                  <span className="font-bold text-foreground">{club.posts.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Likes totales</span>
                  <span className="font-bold text-pink-400">
                    {club.posts.reduce((sum, p) => sum + p.likesCount, 0)}
                  </span>
                </div>
                {club.myRole && (
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Tu rol</span>
                    <span className="font-bold text-indigo-300">{club.myRole}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

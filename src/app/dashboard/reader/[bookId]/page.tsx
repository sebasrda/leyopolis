"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ProfessionalFlipbook = dynamic(() => import("@/components/reader/ProfessionalFlipbook"), {
  ssr: false,
  loading: () => <ReaderLoading label="Preparando lector…" />,
});

function ReaderLoading({ label }: { label: string }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0d1117] text-white gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  );
}

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const [titleParam, setTitleParam] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setTitleParam(searchParams.get("title"));

    const fetchBook = async () => {
      // Demo / hardcoded shortcuts — skip the API roundtrip
      if (bookId === "7" || bookId === "the-great-gatsby") {
        setBookDetails({
          id: bookId,
          title: searchParams.get("title") || "Libro",
          contentUrl: bookId === "the-great-gatsby" ? "/books/gatsby.pdf" : "/books/sample.pdf",
        });
        return;
      }

      try {
        const res = await fetch(`/api/books/${bookId}`, { cache: "force-cache" });
        if (res.ok) {
          const data = await res.json();
          setBookDetails(data);
        } else {
          setError("No se pudo obtener el libro");
        }
      } catch (e) {
        console.error(e);
        setError("Error de conexión");
      }
    };

    fetchBook();
  }, [bookId]);

  // ── Block render until we have a real PDF URL ──────────────────
  // Before: rendered with a fallback /books/sample.pdf while waiting,
  //         causing pdfjs to start loading the wrong file and then
  //         restart when the real URL arrived (double network round-trip).
  if (error) {
    return <ReaderLoading label={error} />;
  }
  if (!bookDetails?.contentUrl) {
    return <ReaderLoading label="Cargando libro…" />;
  }

  return (
    <div className="relative h-screen w-full">
      <ProfessionalFlipbook
        pdfUrl={bookDetails.contentUrl}
        bookTitle={bookDetails?.title || titleParam || "Libro"}
        author={bookDetails?.author}
        bookId={bookId}
        quizId={bookDetails?.quizId}
        selWorkshopId={bookDetails?.selWorkshopId}
        audioUrl={bookDetails?.audioUrl}
        audioSyncMap={bookDetails?.audioSyncMap}
      />
    </div>
  );
}

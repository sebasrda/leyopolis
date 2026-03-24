"use client";

import { useState, useEffect, use } from "react";
import dynamic from 'next/dynamic';

const ProfessionalFlipbook = dynamic(() => import('@/components/reader/ProfessionalFlipbook'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-[#1c1c1c] text-white">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
    </div>
  )
});

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = use(params);
  const [titleParam, setTitleParam] = useState<string | null>(null);
  const [bookDetails, setBookDetails] = useState<any>(null);
  
  useEffect(() => {
    // Only access search params on client side
    const searchParams = new URLSearchParams(window.location.search);
    setTitleParam(searchParams.get("title"));
    
    // Fetch book details if ID is provided
    const fetchBook = async () => {
       if (bookId === "7" || bookId === "the-great-gatsby") return;
       
       try {
         const res = await fetch(`/api/books/${bookId}`);
         if (res.ok) {
           const data = await res.json();
           setBookDetails(data);
         }
       } catch (e) {
         console.error(e);
       }
    };
    
    fetchBook();
  }, [bookId]);

  // Fallback URL logic
  const pdfUrl = bookDetails?.contentUrl || (bookId === "the-great-gatsby" ? "/books/gatsby.pdf" : "/books/sample.pdf");

  return (
    <ProfessionalFlipbook 
      pdfUrl={pdfUrl}
      bookTitle={bookDetails?.title || titleParam || "Libro"}
      bookId={bookId}
    />
  );
}

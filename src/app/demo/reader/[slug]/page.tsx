"use client";

import { use, useMemo } from "react";
import dynamic from "next/dynamic";

const ProfessionalFlipbook = dynamic(() => import("@/components/reader/ProfessionalFlipbook"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-[#1c1c1c] text-white">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  ),
});

const demoBookMap: Record<
  string,
  { title: string; pdfUrl: string }
> = {
  "isla-del-tesoro": {
    title: "La isla del tesoro",
    pdfUrl: "/books/La_isla_del_tesoro_-_Robert_Louis_Stevenson.pdf",
  },
  "vuelta-al-mundo-80-dias": {
    title: "La vuelta al mundo en 80 días",
    pdfUrl: "/books/La_vuelta_al_mundo_en_ochenta_dias-Verne_Julio.pdf",
  },
  "libro-de-la-selva": {
    title: "El libro de la selva",
    pdfUrl: "/books/El_libro_de_la_selva-GrupoRodes.pdf",
  },
};

export default function DemoReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const book = useMemo(() => demoBookMap[slug], [slug]);
  const pdfUrl = book?.pdfUrl ?? "/books/sample.pdf";
  const title = book?.title ?? "Libro demo";

  return <ProfessionalFlipbook pdfUrl={pdfUrl} bookTitle={title} />;
}


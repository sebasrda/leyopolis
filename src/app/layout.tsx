import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { DomTranslationOverlay } from "@/components/i18n/DomTranslationOverlay";
import { ActivityTracker } from "@/components/activity/ActivityTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LEYÓPOLIS | Plataforma de Lectura Inteligente con IA",
  description: "Plataforma educativa de lectura inteligente con IA para aprendizaje de idiomas, comprensión lectora y traducción avanzada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <I18nProvider>
            <TooltipProvider>
              {children}
              <DomTranslationOverlay />
              <ActivityTracker />
            </TooltipProvider>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

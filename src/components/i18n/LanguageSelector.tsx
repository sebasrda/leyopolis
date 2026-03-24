"use client";

import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import i18n, { setStoredLanguage } from "@/i18n/i18n";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "es", label: "Español (es)" },
  { code: "en", label: "English (en)" },
  { code: "fr", label: "Français (fr)" },
  { code: "zh", label: "中文 Mandarín simplificado (zh)" },
  { code: "de", label: "Deutsch (de)" },
];

export function LanguageSelector() {
  useTranslation();

  const changeLanguage = async (code: string) => {
    setStoredLanguage(code);
    await i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100"
          data-i18n-skip="true"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline">🌐 Idioma</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-i18n-skip="true">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => changeLanguage(lang.code)}>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

